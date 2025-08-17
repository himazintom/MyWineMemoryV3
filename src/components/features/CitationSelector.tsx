import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { tastingRecordService } from '../../services/tastingRecordService'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'
import type { TastingRecord, WineMatch, Citation } from '../../types'

interface CitationSelectorProps {
  currentWineInfo: {
    wineName: string
    producer: string
    vintage?: number
  }
  onCitationSelect: (citations: Citation[], fieldsData: Partial<TastingRecord>) => void
  onClose: () => void
  className?: string
}

// 引用可能なフィールドの定義
const CITABLE_FIELDS = {
  basic: {
    label: '基本情報',
    fields: [
      { key: 'country', label: '国' },
      { key: 'region', label: '地域' },
      { key: 'type', label: 'タイプ' },
      { key: 'color', label: '色' },
      { key: 'grapes', label: 'ブドウ品種' },
      { key: 'alcoholContent', label: 'アルコール度数' }
    ]
  },
  analysis: {
    label: '詳細分析',
    fields: [
      { key: 'detailedAnalysis.appearance', label: '外観分析' },
      { key: 'detailedAnalysis.aroma', label: '香り分析' },
      { key: 'detailedAnalysis.taste', label: '味わい分析' }
    ]
  },
  environment: {
    label: '環境・コンテキスト',
    fields: [
      { key: 'environment.glassType', label: 'グラスタイプ' },
      { key: 'environment.temperature', label: '提供温度' },
      { key: 'environment.decantTime', label: 'デカンタ時間' },
      { key: 'environment.pairing', label: 'ペアリング' }
    ]
  }
}

export default function CitationSelector({
  currentWineInfo,
  onCitationSelect,
  onClose,
  className = ''
}: CitationSelectorProps) {
  const { currentUser } = useAuth()
  const [similarWines, setSimilarWines] = useState<WineMatch[]>([])
  const [selectedRecords, setSelectedRecords] = useState<TastingRecord[]>([])
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'select'>('search')

  // 類似ワインを検索
  useEffect(() => {
    const searchSimilarWines = async () => {
      if (!currentUser) return

      try {
        setIsLoading(true)
        setError(null)
        const matches = await tastingRecordService.findSimilarWines(
          currentUser.uid,
          currentWineInfo
        )
        setSimilarWines(matches)
      } catch (err) {
        setError(err instanceof Error ? err.message : '類似ワインの検索に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    searchSimilarWines()
  }, [currentUser, currentWineInfo])

  // 選択された記録の詳細を取得
  const loadSelectedRecord = async (wineId: string) => {
    if (!currentUser) return

    try {
      const record = await tastingRecordService.getRecord(wineId)
      if (record) {
        setSelectedRecords(prev => {
          if (prev.find(r => r.id === record.id)) return prev
          return [...prev, record]
        })
        setActiveTab('select')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録の取得に失敗しました')
    }
  }

  // フィールド選択の切り替え
  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey)
      } else {
        newSet.add(fieldKey)
      }
      return newSet
    })
  }

  // 選択されたフィールドから引用データを構築
  const buildCitationData = useMemo(() => {
    if (selectedRecords.length === 0 || selectedFields.size === 0) {
      return { citations: [], fieldsData: {} }
    }

    const citations: Citation[] = []
    const fieldsData: Partial<TastingRecord> = {}

    selectedRecords.forEach(record => {
      const citedFields: string[] = []

      selectedFields.forEach(fieldKey => {
        const value = getNestedValue(record, fieldKey)
        if (value !== undefined) {
          setNestedValue(fieldsData, fieldKey, value)
          citedFields.push(fieldKey)
        }
      })

      if (citedFields.length > 0) {
        citations.push({
          sourceRecordId: record.id,
          citedFields,
          citedAt: new Date()
        })
      }
    })

    return { citations, fieldsData }
  }, [selectedRecords, selectedFields])

  // 引用実行
  const handleApplyCitation = () => {
    const { citations, fieldsData } = buildCitationData
    if (citations.length > 0) {
      onCitationSelect(citations, fieldsData)
    }
  }

  // ネストしたオブジェクトからの値取得
  function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  // ネストしたオブジェクトへの値設定
  function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  if (!currentUser) {
    return (
      <div className={`citation-selector ${className}`}>
        <ErrorMessage message="ログインが必要です" />
      </div>
    )
  }

  return (
    <div className={`citation-selector ${className}`}>
      <div className="citation-header">
        <h3>過去記録からの引用</h3>
        <Button variant="secondary" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* タブナビゲーション */}
      <div className="citation-tabs">
        <button
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          類似ワイン検索
        </button>
        <button
          className={`tab-button ${activeTab === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTab('select')}
          disabled={selectedRecords.length === 0}
        >
          フィールド選択 ({selectedRecords.length})
        </button>
      </div>

      {/* 類似ワイン検索タブ */}
      {activeTab === 'search' && (
        <div className="search-tab">
          <div className="search-info">
            <p>「{currentWineInfo.wineName}」({currentWineInfo.producer}) に類似するワインを検索しています</p>
          </div>

          {isLoading ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>類似ワインを検索中...</p>
            </div>
          ) : similarWines.length === 0 ? (
            <div className="no-results">
              <p>類似するワインの記録が見つかりませんでした</p>
              <small>同じ生産者や似た名前のワインの記録を作成すると、引用機能が利用できるようになります</small>
            </div>
          ) : (
            <div className="similar-wines-list">
              <h4>類似ワイン ({similarWines.length}件)</h4>
              {similarWines.map((match, index) => (
                <div key={`${match.wineId}-${index}`} className="wine-match-card">
                  <div className="match-info">
                    <h5>{match.wineName}</h5>
                    <p className="producer">{match.producer}</p>
                    {match.vintage && (
                      <p className="vintage">{match.vintage}</p>
                    )}
                    <div className="confidence">
                      類似度: {Math.round(match.confidence * 100)}%
                    </div>
                    <div className="matched-fields">
                      一致項目: {match.matchedFields.join(', ')}
                    </div>
                  </div>
                  <div className="match-actions">
                    <Button
                      size="sm"
                      onClick={() => loadSelectedRecord(match.wineId)}
                      disabled={selectedRecords.some(r => r.id === match.wineId)}
                    >
                      {selectedRecords.some(r => r.id === match.wineId) ? '選択済み' : '選択'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* フィールド選択タブ */}
      {activeTab === 'select' && (
        <div className="select-tab">
          <div className="selected-records">
            <h4>選択された記録 ({selectedRecords.length}件)</h4>
            {selectedRecords.map(record => (
              <div key={record.id} className="selected-record">
                <span>{record.wineName} ({record.producer})</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedRecords(prev => prev.filter(r => r.id !== record.id))}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>

          <div className="field-selection">
            <h4>引用するフィールドを選択</h4>
            {Object.entries(CITABLE_FIELDS).map(([categoryKey, category]) => (
              <div key={categoryKey} className="field-category">
                <h5>{category.label}</h5>
                <div className="field-checkboxes">
                  {category.fields.map(field => {
                    const hasData = selectedRecords.some(record => 
                      getNestedValue(record, field.key) !== undefined
                    )
                    return (
                      <label key={field.key} className={`field-checkbox ${!hasData ? 'disabled' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.key)}
                          onChange={() => toggleField(field.key)}
                          disabled={!hasData}
                        />
                        <span>{field.label}</span>
                        {!hasData && <small> (データなし)</small>}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedFields.size > 0 && (
            <div className="citation-preview">
              <h4>引用プレビュー</h4>
              <p>{selectedFields.size}個のフィールドが引用されます</p>
              <div className="selected-fields-list">
                {Array.from(selectedFields).map(fieldKey => {
                  const fieldInfo = Object.values(CITABLE_FIELDS)
                    .flatMap(cat => cat.fields)
                    .find(f => f.key === fieldKey)
                  return (
                    <span key={fieldKey} className="selected-field-tag">
                      {fieldInfo?.label || fieldKey}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="citation-actions">
            <Button
              variant="primary"
              onClick={handleApplyCitation}
              disabled={selectedFields.size === 0}
            >
              引用を適用 ({selectedFields.size}項目)
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}