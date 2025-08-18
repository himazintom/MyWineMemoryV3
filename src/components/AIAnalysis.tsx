import React, { useState } from 'react'
import { llmService, type TasteProfileAnalysis, type WineRecommendation, type LLMModel } from '../services/llmService'
import { useAuth } from '../contexts/AuthContext'
import { tastingRecordService } from '../services/tastingRecordService'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorMessage from './common/ErrorMessage'
import Button from './common/Button'

interface AIAnalysisProps {
  className?: string
}

type AnalysisType = 'profile' | 'recommendations' | null

export const AIAnalysis: React.FC<AIAnalysisProps> = ({
  className = ''
}) => {
  const { currentUser, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>(null)
  const [tasteProfile, setTasteProfile] = useState<TasteProfileAnalysis | null>(null)
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>([])
  const [usageCount, setUsageCount] = useState(llmService.getUsageCount())
  const [currentModel] = useState<LLMModel | null>(llmService.getCurrentModel())

  const isPremium = userProfile?.subscription?.plan === 'premium'
  const maxUsage = isPremium ? 100 : 10
  const canUseAI = usageCount < maxUsage

  const handleAnalyzeTasteProfile = async () => {
    if (!currentUser || !canUseAI) return

    try {
      setLoading(true)
      setError(null)
      setActiveAnalysis('profile')

      // ユーザーのテイスティング記録を取得
      const result = await tastingRecordService.getUserRecords(currentUser.uid, {
        limitCount: 20,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      })

      if (result.records.length === 0) {
        setError('分析に必要なテイスティング記録がありません。まずはワインを記録してみてください。')
        return
      }

      const analysis = await llmService.analyzeTasteProfile(result.records, isPremium)
      setTasteProfile(analysis)
      setUsageCount(llmService.getUsageCount())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI分析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleGetRecommendations = async () => {
    if (!currentUser || !canUseAI) return

    try {
      setLoading(true)
      setError(null)
      setActiveAnalysis('recommendations')

      // ユーザーのテイスティング記録を取得
      const result = await tastingRecordService.getUserRecords(currentUser.uid, {
        limitCount: 20,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      })

      if (result.records.length === 0) {
        setError('推薦に必要なテイスティング記録がありません。まずはワインを記録してみてください。')
        return
      }

      const wineRecommendations = await llmService.recommendWines(result.records, '', '', isPremium)
      setRecommendations(wineRecommendations)
      setUsageCount(llmService.getUsageCount())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI推薦の生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const renderFlavorProfile = (profile: TasteProfileAnalysis['flavorProfile']) => {
    const attributes = [
      { key: 'sweetness', label: '甘味', color: '#e74c3c' },
      { key: 'acidity', label: '酸味', color: '#f39c12' },
      { key: 'tannins', label: 'タンニン', color: '#9b59b6' },
      { key: 'body', label: 'ボディ', color: '#34495e' }
    ]

    return (
      <div className="flavor-profile">
        <h4>🍷 味覚プロフィール</h4>
        <div className="flavor-chart">
          {attributes.map(({ key, label, color }) => (
            <div key={key} className="flavor-attribute">
              <div className="attribute-info">
                <span className="attribute-label">{label}</span>
                <span className="attribute-value">{profile[key as keyof typeof profile]}/10</span>
              </div>
              <div className="attribute-bar">
                <div 
                  className="attribute-fill"
                  style={{ 
                    width: `${(profile[key as keyof typeof profile] / 10) * 100}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`ai-analysis ${className}`}>
      <div className="analysis-header">
        <h3>🤖 AI ワイン分析</h3>
        <div className="header-info">
          <div className="model-info">
            {currentModel && (
              <span className="current-model">
                🧠 {currentModel.name}
              </span>
            )}
          </div>
          <div className="usage-info">
            <span className="usage-count">
              {usageCount}/{maxUsage} 回使用
            </span>
            <span className="plan-badge">
              {isPremium ? 'Premium' : 'Free'}
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {!canUseAI && (
        <div className="usage-limit-notice">
          <h4>📊 月間利用上限に達しました</h4>
          <p>
            {isPremium 
              ? 'プレミアムプランの月間利用回数（100回）に達しました。'
              : 'フリープランの月間利用回数（10回）に達しました。プレミアムプランにアップグレードすると月100回まで利用できます。'
            }
          </p>
          {!isPremium && (
            <Button variant="primary" size="sm">
              プレミアムにアップグレード
            </Button>
          )}
        </div>
      )}

      {canUseAI && (
        <div className="analysis-actions">
          <Button
            variant="secondary"
            onClick={handleAnalyzeTasteProfile}
            disabled={loading}
            isLoading={loading && activeAnalysis === 'profile'}
          >
            🧠 味覚プロフィール分析
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleGetRecommendations}
            disabled={loading}
            isLoading={loading && activeAnalysis === 'recommendations'}
          >
            💡 おすすめワイン提案
          </Button>
        </div>
      )}

      {loading && (
        <div className="analysis-loading">
          <LoadingSpinner />
          <p>AI分析中...</p>
        </div>
      )}

      {/* 味覚プロフィール分析結果 */}
      {tasteProfile && (
        <div className="analysis-result">
          <div className="result-header">
            <h4>🧠 あなたの味覚プロフィール</h4>
          </div>
          
          <div className="profile-summary">
            <p>{tasteProfile.summary}</p>
          </div>

          {renderFlavorProfile(tasteProfile.flavorProfile)}

          <div className="preferred-types">
            <h4>🍇 好みのワインタイプ</h4>
            <div className="type-tags">
              {tasteProfile.preferredTypes.map((type, index) => (
                <span key={index} className="type-tag">
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="recommendations-section">
            <h4>📝 おすすめ</h4>
            <ul className="recommendation-list">
              {tasteProfile.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>

          {tasteProfile.insights.length > 0 && (
            <div className="insights-section">
              <h4>💎 発見とインサイト</h4>
              <ul className="insights-list">
                {tasteProfile.insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ワイン推薦結果 */}
      {recommendations.length > 0 && (
        <div className="analysis-result">
          <div className="result-header">
            <h4>💡 あなたにおすすめのワイン</h4>
          </div>
          
          <div className="wine-recommendations">
            {recommendations.map((wine, index) => (
              <div key={index} className="wine-recommendation">
                <div className="wine-header">
                  <div className="wine-info">
                    <h5>{wine.wineName}</h5>
                    <p className="producer">{wine.producer}</p>
                    {wine.vintage && (
                      <span className="vintage">{wine.vintage}</span>
                    )}
                  </div>
                  <div className="confidence-score">
                    <span className="confidence-value">
                      {Math.round(wine.confidence * 100)}%
                    </span>
                    <span className="confidence-label">信頼度</span>
                  </div>
                </div>
                
                <div className="wine-details">
                  <div className="location">
                    📍 {wine.country}{wine.region && ` - ${wine.region}`}
                  </div>
                  
                  {wine.grapes.length > 0 && (
                    <div className="grapes">
                      🍇 {wine.grapes.join(', ')}
                    </div>
                  )}
                  
                  <div className="price-range">
                    💰 {wine.priceRange}
                  </div>
                </div>
                
                <div className="recommendation-reason">
                  <strong>推薦理由:</strong> {wine.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI機能の説明 */}
      {!tasteProfile && !recommendations.length && !loading && (
        <div className="ai-info">
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">🧠</div>
              <div className="feature-content">
                <h4>味覚プロフィール分析</h4>
                <p>あなたのテイスティング記録をAIが分析し、味覚の傾向や好みを可視化します。</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">💡</div>
              <div className="feature-content">
                <h4>パーソナライズド推薦</h4>
                <p>あなたの好みに基づいて、新しく試すべきワインをAIが提案します。</p>
              </div>
            </div>
          </div>
          
          <div className="usage-note">
            <p>
              <strong>📝 利用にはテイスティング記録が必要です</strong><br/>
              AI分析を利用するには、少なくとも3つ以上のテイスティング記録が必要です。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}