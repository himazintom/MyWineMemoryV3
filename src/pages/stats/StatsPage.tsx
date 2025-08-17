import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import tastingRecordService from '../../services/tastingRecordService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import StatsCharts from '../../components/stats/StatsCharts'
import { AIAnalysis } from '../../components/AIAnalysis'

interface UserStats {
  totalRecords: number
  averageRating: number
  favoriteCountries: Array<{ country: string; count: number }>
  favoriteTypes: Array<{ type: string; count: number }>
  monthlyRecords: Array<{ month: string; count: number }>
  ratingDistribution: Array<{ range: string; count: number }>
  priceDistribution: Array<{ range: string; count: number; avgRating: number }>
  recentActivity: Array<{ date: string; count: number }>
}

export default function StatsPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userProfile) return

    const loadStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const userStats = await tastingRecordService.getUserStats(userProfile.uid)
        setStats(userStats)
      } catch (err) {
        console.error('Failed to load stats:', err)
        setError('統計データの読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [userProfile])

  if (!userProfile) {
    return (
      <div className="stats-page">
        <div className="page-header">
          <h1>統計・分析</h1>
        </div>
        <ErrorMessage message="ログインが必要です" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="stats-page">
        <div className="page-header">
          <h1>統計・分析</h1>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="stats-page">
        <div className="page-header">
          <h1>統計・分析</h1>
        </div>
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      </div>
    )
  }

  if (!stats || stats.totalRecords === 0) {
    return (
      <div className="stats-page">
        <div className="page-header">
          <h1>統計・分析</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>統計データがありません</h2>
          <p>テイスティング記録を作成すると、ここに統計データが表示されます</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-page">
      <div className="page-header">
        <h1>統計・分析</h1>
        <div className="header-summary">
          <div className="summary-card">
            <div className="summary-label">総記録数</div>
            <div className="summary-value">{stats.totalRecords}件</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">平均評価</div>
            <div className="summary-value">{stats.averageRating.toFixed(1)}/10</div>
          </div>
        </div>
      </div>

      <div className="stats-content">
        {/* 基本統計カード */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>お気に入りの国</h3>
            <div className="favorite-list">
              {stats.favoriteCountries.slice(0, 5).map((country, index) => (
                <div key={country.country} className="favorite-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{country.country}</span>
                  <span className="count">{country.count}件</span>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-card">
            <h3>お気に入りのタイプ</h3>
            <div className="favorite-list">
              {stats.favoriteTypes.map((type, index) => {
                const typeLabels: Record<string, string> = {
                  red: '赤ワイン',
                  white: '白ワイン',
                  rose: 'ロゼワイン',
                  sparkling: 'スパークリング',
                  fortified: '酒精強化',
                  dessert: 'デザートワイン'
                }
                return (
                  <div key={type.type} className="favorite-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{typeLabels[type.type] || type.type}</span>
                    <span className="count">{type.count}件</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="stat-card">
            <h3>評価分布</h3>
            <div className="rating-bars">
              {stats.ratingDistribution.map((item) => {
                const percentage = stats.totalRecords > 0 
                  ? (item.count / stats.totalRecords) * 100 
                  : 0
                return (
                  <div key={item.range} className="rating-bar">
                    <div className="rating-bar-label">
                      <span>{item.range}</span>
                      <span>{item.count}件</span>
                    </div>
                    <div className="rating-bar-fill">
                      <div 
                        className="rating-bar-progress"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="stat-card">
            <h3>価格帯別分析</h3>
            <div className="price-analysis">
              {stats.priceDistribution
                .filter(item => item.count > 0)
                .map((item) => (
                  <div key={item.range} className="price-item">
                    <div className="price-range">{item.range}</div>
                    <div className="price-stats">
                      <span className="price-count">{item.count}件</span>
                      <span className="price-rating">
                        平均: {item.avgRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* AI分析セクション */}
        <div className="ai-section">
          <AIAnalysis />
        </div>

        {/* チャート表示 */}
        <StatsCharts 
          monthlyRecords={stats.monthlyRecords}
          favoriteCountries={stats.favoriteCountries}
          favoriteTypes={stats.favoriteTypes}
          ratingDistribution={stats.ratingDistribution}
          recentActivity={stats.recentActivity}
        />
      </div>
    </div>
  )
}