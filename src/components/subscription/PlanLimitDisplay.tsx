import { usePlanLimits } from '../../hooks/usePlanLimits'
import LoadingSpinner from '../common/LoadingSpinner'

interface PlanLimitDisplayProps {
  className?: string
  compact?: boolean
}

export default function PlanLimitDisplay({ className = '', compact = false }: PlanLimitDisplayProps) {
  const { limits, usage, isLoading, error } = usePlanLimits()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error || !limits || !usage) {
    return null
  }

  const isPremium = limits.plan === 'premium' || limits.plan === 'premium_yearly'
  const llmUsagePercentage = Math.min(100, (usage.llmUsageThisMonth / limits.monthlyLLMLimit) * 100)
  const remainingLLM = Math.max(0, limits.monthlyLLMLimit - usage.llmUsageThisMonth)

  if (compact) {
    return (
      <div className={`plan-limit-compact ${className}`}>
        <div className="plan-badge">
          <span className={`badge ${isPremium ? 'premium' : 'free'}`}>
            {isPremium ? 'Premium' : 'Free'}
          </span>
        </div>
        
        <div className="usage-indicators">
          <div className="usage-item">
            <span className="icon">🖼️</span>
            <span>{limits.maxImagesPerRecord}/記録</span>
          </div>
          
          <div className="usage-item">
            <span className="icon">🤖</span>
            <span>{remainingLLM}回残り</span>
          </div>
        </div>

        <style jsx>{`
          .plan-limit-compact {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.5rem;
          }

          .plan-badge .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .badge.premium {
            background: var(--primary);
            color: white;
          }

          .badge.free {
            background: var(--border);
            color: var(--text-secondary);
          }

          .usage-indicators {
            display: flex;
            gap: 0.75rem;
          }

          .usage-item {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
          }

          .icon {
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`plan-limit-display ${className}`}>
      <div className="plan-header">
        <div className="plan-info">
          <h3>現在のプラン</h3>
          <span className={`plan-badge ${isPremium ? 'premium' : 'free'}`}>
            {isPremium ? 'プレミアムプラン' : 'フリープラン'}
          </span>
        </div>
      </div>

      <div className="limits-grid">
        <div className="limit-card">
          <div className="limit-header">
            <span className="icon">🖼️</span>
            <h4>画像アップロード</h4>
          </div>
          <div className="limit-content">
            <div className="limit-value">
              {limits.maxImagesPerRecord}枚/記録
            </div>
            <p className="limit-description">
              1つのテイスティング記録につき最大{limits.maxImagesPerRecord}枚の画像をアップロードできます
            </p>
          </div>
        </div>

        <div className="limit-card">
          <div className="limit-header">
            <span className="icon">🤖</span>
            <h4>AI分析</h4>
          </div>
          <div className="limit-content">
            <div className="limit-value">
              {usage.llmUsageThisMonth}/{limits.monthlyLLMLimit}回
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${llmUsagePercentage}%` }}
              />
            </div>
            <p className="limit-description">
              今月あと{remainingLLM}回のAI分析が利用可能です
            </p>
          </div>
        </div>

        <div className="limit-card">
          <div className="limit-header">
            <span className="icon">📊</span>
            <h4>記録数</h4>
          </div>
          <div className="limit-content">
            <div className="limit-value">
              {limits.hasUnlimitedRecords ? '無制限' : '制限あり'}
            </div>
            <p className="limit-description">
              テイスティング記録の作成に制限はありません
            </p>
          </div>
        </div>
      </div>

      {!isPremium && (
        <div className="upgrade-prompt">
          <div className="upgrade-content">
            <h4>🚀 プレミアムプランでもっと便利に</h4>
            <ul>
              <li>画像アップロード：4枚/記録</li>
              <li>AI分析：月100回</li>
              <li>高度統計分析</li>
              <li>優先サポート</li>
            </ul>
            <button className="upgrade-button">
              プレミアムプランにアップグレード
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .plan-limit-display {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border);
        }

        .plan-header {
          margin-bottom: 2rem;
        }

        .plan-info h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .plan-badge {
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .plan-badge.premium {
          background: var(--primary);
          color: white;
        }

        .plan-badge.free {
          background: var(--border);
          color: var(--text-secondary);
        }

        .limits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .limit-card {
          background: var(--background);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid var(--border);
        }

        .limit-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .limit-header .icon {
          font-size: 1.5rem;
        }

        .limit-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }

        .limit-content {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .limit-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: var(--border);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s ease;
        }

        .limit-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .upgrade-prompt {
          background: linear-gradient(135deg, var(--primary-light), var(--primary-lighter));
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid var(--primary-light);
        }

        .upgrade-content h4 {
          margin: 0 0 1rem 0;
          color: var(--primary);
          font-size: 1.125rem;
        }

        .upgrade-content ul {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
        }

        .upgrade-content li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .upgrade-content li::before {
          content: '✓';
          color: var(--success);
          font-weight: bold;
        }

        .upgrade-button {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upgrade-button:hover {
          background: var(--primary-dark);
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .plan-limit-display {
            padding: 1rem;
          }

          .limits-grid {
            grid-template-columns: 1fr;
          }

          .upgrade-prompt {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  )
}