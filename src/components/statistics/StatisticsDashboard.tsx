import { useState } from 'react'
import { useStatistics, useYearSummary } from '../../hooks/useStatistics'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'
import Button from '../common/Button'
import type { StatisticsData } from '../../services/statisticsService'

interface StatisticsDashboardProps {
  className?: string
}

export default function StatisticsDashboard({ className = '' }: StatisticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'analysis' | 'summary'>('overview')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const { 
    statistics, 
    isLoading, 
    error, 
    refresh, 
    lastUpdated 
  } = useStatistics({ autoRefresh: true })

  const {
    summary: yearSummary,
    isLoading: summaryLoading
  } = useYearSummary(selectedYear)

  if (isLoading && !statistics) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refresh} />
  }

  if (!statistics) {
    return (
      <div className="no-data">
        <h3>統計データがありません</h3>
        <p>テイスティング記録を追加すると統計が表示されます</p>
      </div>
    )
  }


  return (
    <div className={`statistics-dashboard ${className}`}>
      {/* ヘッダー */}
      <div className="dashboard-header">
        <div className="header-content">
          <h2>統計ダッシュボード</h2>
          {lastUpdated && (
            <span className="last-updated">
              最終更新: {lastUpdated.toLocaleString()}
            </span>
          )}
        </div>
        <Button onClick={refresh} variant="secondary" size="sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path 
              d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.76-4.24L11 5h5V0l-2.35 2.35z"
              fill="currentColor"
            />
          </svg>
          更新
        </Button>
      </div>

      {/* タブナビゲーション */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概要
        </button>
        <button
          className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          トレンド
        </button>
        <button
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          詳細分析
        </button>
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          年間サマリー
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab statistics={statistics} />
        )}
        
        {activeTab === 'trends' && (
          <TrendsTab statistics={statistics} />
        )}
        
        {activeTab === 'analysis' && (
          <AnalysisTab statistics={statistics} />
        )}
        
        {activeTab === 'summary' && (
          <SummaryTab 
            year={selectedYear}
            onYearChange={setSelectedYear}
            summary={yearSummary}
            isLoading={summaryLoading}
          />
        )}
      </div>

      <style jsx>{`
        .statistics-dashboard {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          margin: 2rem 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .header-content h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .last-updated {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        .tab-button {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .tab-button:hover {
          color: var(--text-primary);
        }

        .tab-button.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .tab-content {
          min-height: 400px;
        }

        .no-data {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-secondary);
        }

        .no-data h3 {
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .statistics-dashboard {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .tab-navigation {
            overflow-x: auto;
            padding-bottom: 0.5rem;
          }

          .tab-button {
            white-space: nowrap;
            padding: 0.5rem 1rem;
          }
        }
      `}</style>
    </div>
  )
}

// 概要タブコンポーネント
function OverviewTab({ statistics }: { statistics: StatisticsData }) {
  return (
    <div className="overview-tab">
      {/* 基本統計カード */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🍷</div>
          <div className="stat-content">
            <h3>総記録数</h3>
            <div className="stat-value">{statistics.totalRecords}</div>
            <div className="stat-label">テイスティング記録</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>平均評価</h3>
            <div className="stat-value">{statistics.averageRating.toFixed(1)}</div>
            <div className="stat-label">10点満点</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>総支出</h3>
            <div className="stat-value">
              {new Intl.NumberFormat('ja-JP', {
                style: 'currency',
                currency: 'JPY'
              }).format(statistics.totalSpent)}
            </div>
            <div className="stat-label">ワイン購入費用</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <h3>ユニークワイン</h3>
            <div className="stat-value">{statistics.uniqueWines}</div>
            <div className="stat-label">異なるワイン</div>
          </div>
        </div>
      </div>

      {/* 上位分析 */}
      <div className="top-analysis">
        <div className="analysis-section">
          <h4>人気の国 TOP 5</h4>
          <div className="ranking-list">
            {statistics.countryAnalysis.slice(0, 5).map((country, index) => (
              <div key={country.country} className="ranking-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{country.country}</span>
                <span className="count">{country.count}本</span>
                <span className="percentage">{country.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analysis-section">
          <h4>ワインタイプ分布</h4>
          <div className="ranking-list">
            {statistics.typeAnalysis.slice(0, 5).map((type, index) => (
              <div key={type.type} className="ranking-item">
                <span className="rank">#{index + 1}</span>
                <span className="name">{type.type}</span>
                <span className="count">{type.count}本</span>
                <span className="percentage">{type.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .overview-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 2.5rem;
        }

        .stat-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .top-analysis {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .analysis-section {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .analysis-section h4 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }

        .ranking-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .ranking-item {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: 1rem;
          align-items: center;
          padding: 0.75rem;
          background: var(--surface);
          border-radius: 0.5rem;
        }

        .rank {
          font-weight: bold;
          color: var(--primary);
          min-width: 30px;
        }

        .name {
          color: var(--text-primary);
          font-weight: 500;
        }

        .count {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .percentage {
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

// トレンドタブコンポーネント（簡略版）
function TrendsTab({ statistics }: { statistics: StatisticsData }) {
  return (
    <div className="trends-tab">
      <h3>月別記録数の推移</h3>
      <div className="chart-placeholder">
        <p>月別のテイスティング記録数グラフ（Chart.js実装予定）</p>
        <div className="monthly-data">
          {statistics.monthlyStats.slice(0, 12).map((month) => (
            <div key={`${month.year}-${month.month}`} className="month-item">
              <span>{month.year}/{month.month}</span>
              <span>{month.recordCount}本</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .trends-tab {
          padding: 1rem 0;
        }

        .chart-placeholder {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          margin-top: 1rem;
        }

        .monthly-data {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }

        .month-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: var(--surface);
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  )
}

// 詳細分析タブコンポーネント（簡略版）
function AnalysisTab({ statistics }: { statistics: StatisticsData }) {
  return (
    <div className="analysis-tab">
      <h3>価格分析</h3>
      <div className="price-ranges">
        {statistics.priceAnalysis.ranges.map((range, index) => (
          <div key={index} className="price-range-item">
            <span className="range-label">
              {range.min === 0 ? `〜${range.max.toLocaleString()}円` :
               range.max === Infinity ? `${range.min.toLocaleString()}円〜` :
               `${range.min.toLocaleString()}〜${range.max.toLocaleString()}円`}
            </span>
            <span className="range-count">{range.count}本</span>
            <span className="range-percentage">{range.percentage.toFixed(1)}%</span>
            <span className="range-rating">⭐{range.averageRating.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .analysis-tab {
          padding: 1rem 0;
        }

        .price-ranges {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .price-range-item {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 1rem;
          background: var(--background);
          border-radius: 0.5rem;
          align-items: center;
        }

        .range-label {
          font-weight: 500;
          color: var(--text-primary);
        }

        .range-count, .range-percentage, .range-rating {
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

// 年間サマリータブコンポーネント（簡略版）
function SummaryTab({ 
  year, 
  onYearChange, 
  summary, 
  isLoading 
}: { 
  year: number
  onYearChange: (year: number) => void
  summary: any
  isLoading: boolean 
}) {
  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!summary || summary.totalRecords === 0) {
    return (
      <div className="no-summary">
        <h3>{year}年のデータがありません</h3>
        <p>この年にテイスティング記録がありません</p>
      </div>
    )
  }

  return (
    <div className="summary-tab">
      <div className="year-selector">
        <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
      </div>

      <div className="summary-content">
        <h3>{year}年の振り返り</h3>
        <div className="summary-stats">
          <div className="summary-item">
            <span className="label">総記録数:</span>
            <span className="value">{summary.totalRecords}本</span>
          </div>
          <div className="summary-item">
            <span className="label">平均評価:</span>
            <span className="value">{summary.averageRating.toFixed(1)}</span>
          </div>
          <div className="summary-item">
            <span className="label">お気に入りの国:</span>
            <span className="value">{summary.favoriteCountry}</span>
          </div>
          <div className="summary-item">
            <span className="label">よく飲んだタイプ:</span>
            <span className="value">{summary.favoriteType}</span>
          </div>
        </div>

        {summary.achievements.length > 0 && (
          <div className="achievements">
            <h4>🏆 達成項目</h4>
            <ul>
              {summary.achievements.map((achievement: string, index: number) => (
                <li key={index}>{achievement}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        .summary-tab {
          padding: 1rem 0;
        }

        .year-selector {
          margin-bottom: 2rem;
        }

        .year-selector select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--surface);
          color: var(--text-primary);
        }

        .summary-content {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 2rem;
        }

        .summary-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 1rem 0;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: var(--surface);
          border-radius: 0.5rem;
        }

        .label {
          color: var(--text-secondary);
        }

        .value {
          font-weight: 600;
          color: var(--text-primary);
        }

        .achievements {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border);
        }

        .achievements h4 {
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .achievements ul {
          list-style: none;
          padding: 0;
        }

        .achievements li {
          padding: 0.5rem 0;
          color: var(--text-secondary);
        }

        .no-summary {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}