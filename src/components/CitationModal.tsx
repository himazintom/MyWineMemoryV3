import React, { useState, useEffect } from 'react'
import type { TastingRecord } from '../types'
import { citationService, type CitationCandidate, type CitationPreview } from '../services/citationService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'

interface CitationModalProps {
  isOpen: boolean
  onClose: () => void
  targetRecord: Partial<TastingRecord>
  onApplyCitation: (updatedRecord: Partial<TastingRecord>) => void
}

export const CitationModal: React.FC<CitationModalProps> = ({
  isOpen,
  onClose,
  targetRecord,
  onApplyCitation
}) => {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CitationCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CitationCandidate | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [preview, setPreview] = useState<CitationPreview | null>(null)
  const [step, setStep] = useState<'search' | 'select' | 'preview'>('search')

  // モーダルが開かれたときに類似ワインを検索
  useEffect(() => {
    if (isOpen && currentUser) {
      searchSimilarWines()
    }
  }, [isOpen, currentUser, targetRecord])

  // 選択されたフィールドが変更されたときにプレビューを更新
  useEffect(() => {
    if (selectedCandidate && selectedFields.length > 0) {
      generatePreview()
    }
  }, [selectedCandidate, selectedFields])

  const searchSimilarWines = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      const results = await citationService.findSimilarWines(
        targetRecord,
        currentUser.uid,
        {
          threshold: 0.3,
          maxResults: 10
        }
      )

      setCandidates(results)
      setStep('search')
    } catch (err) {
      setError(err instanceof Error ? err.message : '類似ワインの検索に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCandidate = (candidate: CitationCandidate) => {
    setSelectedCandidate(candidate)
    setSelectedFields(candidate.suggestedFields)
    setStep('select')
  }

  const handleFieldChange = (field: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, field])
    } else {
      setSelectedFields(prev => prev.filter(f => f !== field))
    }
  }

  const generatePreview = async () => {
    if (!selectedCandidate) return

    try {
      const previewData = await citationService.generateCitationPreview(
        targetRecord,
        selectedCandidate.record,
        selectedFields
      )
      setPreview(previewData)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プレビューの生成に失敗しました')
    }
  }

  const handleApplyCitation = async () => {
    if (!selectedCandidate || !currentUser) return

    setLoading(true)
    setError(null)

    try {
      const updatedRecord = await citationService.applyCitation(
        targetRecord,
        selectedCandidate.record,
        selectedFields
      )

      onApplyCitation(updatedRecord)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '引用の適用に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'preview') {
      setStep('select')
    } else if (step === 'select') {
      setStep('search')
      setSelectedCandidate(null)
      setSelectedFields([])
      setPreview(null)
    }
  }

  const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      region: '地域',
      grapes: 'ブドウ品種',
      alcoholContent: 'アルコール度数',
      detailedAnalysis: '詳細分析',
      environment: '環境・コンテキスト',
      tags: 'タグ'
    }
    return fieldNames[field] || field
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'var(--success)'
    if (confidence >= 0.6) return 'var(--warning)'
    return 'var(--error)'
  }

  // フィールドのプレビューテキストを取得するヘルパー関数
  const getFieldPreview = (record: TastingRecord, field: string): string => {
    const value = record[field as keyof TastingRecord]
    
    if (!value) return '-'
    
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    return String(value)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content citation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>過去記録からの引用</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {error && <ErrorMessage message={error} />}

        {loading && (
          <div className="loading-section">
            <LoadingSpinner />
            <p>処理中...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ステップインジケーター */}
            <div className="step-indicator">
              <div className={`step ${step === 'search' ? 'active' : (step === 'select' || step === 'preview') ? 'completed' : ''}`}>
                1. 類似記録選択
              </div>
              <div className={`step ${step === 'select' ? 'active' : step === 'preview' ? 'completed' : ''}`}>
                2. フィールド選択
              </div>
              <div className={`step ${step === 'preview' ? 'active' : ''}`}>
                3. プレビュー確認
              </div>
            </div>

            {/* 検索結果表示 */}
            {step === 'search' && (
              <div className="search-results">
                <h3>類似ワイン記録 ({candidates.length}件)</h3>
                
                {candidates.length === 0 ? (
                  <div className="empty-state">
                    <p>類似するワイン記録が見つかりませんでした。</p>
                    <p>同じ生産者や品種のワインを過去に記録している場合、引用候補として表示されます。</p>
                  </div>
                ) : (
                  <div className="candidates-list">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.record.id}
                        className="candidate-item"
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <div className="candidate-header">
                          <div className="wine-info">
                            <h4>{candidate.record.wineName}</h4>
                            <p>{candidate.record.producer}</p>
                            {candidate.record.vintage && (
                              <span className="vintage">{candidate.record.vintage}</span>
                            )}
                          </div>
                          <div className="confidence-score">
                            <span 
                              className="confidence-value"
                              style={{ color: getConfidenceColor(candidate.confidence) }}
                            >
                              {Math.round(candidate.confidence * 100)}%
                            </span>
                            <span className="confidence-label">類似度</span>
                          </div>
                        </div>
                        
                        <div className="match-info">
                          <div className="matched-fields">
                            <strong>一致項目:</strong>
                            {candidate.matchedFields.map(field => (
                              <span key={field} className="match-tag">
                                {formatFieldName(field)}
                              </span>
                            ))}
                          </div>
                          
                          {candidate.suggestedFields.length > 0 && (
                            <div className="suggested-fields">
                              <strong>引用可能:</strong>
                              {candidate.suggestedFields.map(field => (
                                <span key={field} className="suggestion-tag">
                                  {formatFieldName(field)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* フィールド選択 */}
            {step === 'select' && selectedCandidate && (
              <div className="field-selection">
                <div className="source-info">
                  <h3>引用元記録</h3>
                  <div className="source-record">
                    <h4>{selectedCandidate.record.wineName}</h4>
                    <p>{selectedCandidate.record.producer} {selectedCandidate.record.vintage}</p>
                  </div>
                </div>

                <h3>引用するフィールドを選択</h3>
                <div className="field-options">
                  {selectedCandidate.suggestedFields.map(field => (
                    <label key={field} className="field-option">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={(e) => handleFieldChange(field, e.target.checked)}
                      />
                      <span className="field-name">{formatFieldName(field)}</span>
                      <span className="field-preview">
                        {getFieldPreview(selectedCandidate.record, field)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* プレビュー表示 */}
            {step === 'preview' && preview && (
              <div className="citation-preview">
                <h3>引用プレビュー</h3>
                
                {preview.conflicts.length > 0 && (
                  <div className="conflicts-warning">
                    <h4>⚠️ 競合するフィールド</h4>
                    <p>以下のフィールドは既存の値と異なります：</p>
                    <ul>
                      {preview.conflicts.map(field => (
                        <li key={field}>{formatFieldName(field)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="preview-fields">
                  <h4>引用される内容</h4>
                  {selectedFields.map(field => (
                    <div key={field} className="preview-field">
                      <strong>{formatFieldName(field)}:</strong>
                      <span>{getFieldPreview(preview.sourceRecord, field)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* アクションボタン */}
        <div className="modal-actions">
          {step !== 'search' && (
            <button className="back-button" onClick={handleBack}>
              戻る
            </button>
          )}
          
          <button className="cancel-button" onClick={onClose}>
            キャンセル
          </button>

          {step === 'select' && selectedFields.length > 0 && (
            <button 
              className="preview-button" 
              onClick={generatePreview}
              disabled={loading}
            >
              プレビュー
            </button>
          )}

          {step === 'preview' && (
            <button 
              className="apply-button" 
              onClick={handleApplyCitation}
              disabled={loading}
            >
              引用を適用
            </button>
          )}
        </div>
      </div>
    </div>
  )
}