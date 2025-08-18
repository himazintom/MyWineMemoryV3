import React, { useState, useEffect } from 'react'
import { llmService, type LLMModel } from '../../services/llmService'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'
import Button from '../common/Button'

interface ModelSelectorProps {
  className?: string
  showOnlyFree?: boolean
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  className = '',
  showOnlyFree = true
}) => {
  const { userProfile } = useAuth()
  const [models, setModels] = useState<LLMModel[]>([])
  const [currentModel, setCurrentModel] = useState<LLMModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)

  // 管理者権限チェック（簡易版）
  const isAdmin = userProfile?.email?.includes('admin') || userProfile?.uid === 'admin'

  useEffect(() => {
    loadModels()
  }, [showOnlyFree])

  const loadModels = () => {
    try {
      const availableModels = showOnlyFree 
        ? llmService.getFreeModels() 
        : llmService.getAvailableModels()
      
      setModels(availableModels)
      setCurrentModel(llmService.getCurrentModel())
    } catch (err) {
      setError('モデル情報の読み込みに失敗しました')
    }
  }

  const handleModelSwitch = async (modelId: string) => {
    try {
      setSwitching(modelId)
      setError(null)

      const success = await llmService.switchModel(modelId)
      
      if (success) {
        setCurrentModel(llmService.getCurrentModel())
        
        // 管理者の場合は設定をサーバーに保存
        if (isAdmin) {
          await saveModelToServer(modelId)
        }
      } else {
        throw new Error('モデルの切り替えに失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'モデルの切り替えに失敗しました')
    } finally {
      setSwitching(null)
    }
  }

  const saveModelToServer = async (modelId: string) => {
    try {
      if (!userProfile?.uid) return
      
      // AdminServiceを使ってFirestoreに保存
      const { adminService } = await import('../../services/adminService')
      await adminService.setCurrentModel(modelId, userProfile.uid)
      
    } catch (err) {
      console.warn('Failed to save model setting:', err)
    }
  }

  const testModel = async (modelId: string) => {
    try {
      setLoading(true)
      setError(null)

      // 現在のモデルを一時的に保存
      const originalModel = llmService.getCurrentModel()
      
      // テスト用にモデルを切り替え
      await llmService.switchModel(modelId)
      
      // 簡単なテストリクエスト
      const testPrompt = 'こんにちは。あなたは何のAIですか？20文字以内で答えてください。'
      
      const startTime = Date.now()
      const response = await llmService['makeRequest'](testPrompt)
      const endTime = Date.now()
      
      const responseTime = endTime - startTime
      
      alert(`テスト成功！\n応答時間: ${responseTime}ms\n応答: ${response.slice(0, 50)}...`)
      
      // 元のモデルに戻す
      if (originalModel) {
        await llmService.switchModel(originalModel.id)
      }
      
    } catch (err) {
      setError(`テストに失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!models.length) {
    return (
      <div className={`model-selector ${className}`}>
        <p>利用可能なモデルがありません</p>
      </div>
    )
  }

  return (
    <div className={`model-selector ${className}`}>
      <div className="selector-header">
        <h3>🤖 AIモデル選択</h3>
        {currentModel && (
          <div className="current-model">
            現在: <strong>{currentModel.name}</strong>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="models-grid">
        {models.map((model) => (
          <div 
            key={model.id}
            className={`model-card ${currentModel?.id === model.id ? 'active' : ''}`}
          >
            <div className="model-header">
              <h4>{model.name}</h4>
              <div className="model-badges">
                {model.isFree && <span className="badge free">無料</span>}
                <span className="badge provider">{model.provider}</span>
              </div>
            </div>

            <div className="model-description">
              <p>{model.description}</p>
            </div>

            <div className="model-specs">
              <div className="spec-item">
                <span className="spec-label">最大トークン:</span>
                <span className="spec-value">{model.maxTokens.toLocaleString()}</span>
              </div>
              
              {!model.isFree && (
                <div className="spec-item">
                  <span className="spec-label">コスト:</span>
                  <span className="spec-value">${model.costPer1MTokens}/1M tokens</span>
                </div>
              )}
            </div>

            <div className="model-actions">
              {currentModel?.id === model.id ? (
                <div className="current-badge">✓ 使用中</div>
              ) : (
                <div className="action-buttons">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => testModel(model.id)}
                    disabled={loading || switching !== null}
                  >
                    テスト
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleModelSwitch(model.id)}
                    disabled={loading || switching !== null}
                    isLoading={switching === model.id}
                  >
                    {switching === model.id ? '切り替え中...' : '選択'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="loading-section">
          <LoadingSpinner />
          <p>テスト中...</p>
        </div>
      )}

      <div className="selector-info">
        <div className="info-item">
          <strong>💡 ヒント:</strong>
          <p>無料モデルは使用制限がありますが、コストゼロで利用できます。</p>
        </div>
        
        {isAdmin && (
          <div className="admin-info">
            <strong>👑 管理者権限:</strong>
            <p>選択したモデルは全ユーザーに適用されます。</p>
          </div>
        )}
      </div>
    </div>
  )
}