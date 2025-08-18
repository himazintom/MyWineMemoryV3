import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import stripeService from '../../services/stripeService'
import type { SubscriptionPlan, UserSubscription } from '../../services/stripeService'

interface SubscriptionPlansProps {
  className?: string
}

export default function SubscriptionPlans({ className = '' }: SubscriptionPlansProps) {
  const { currentUser: user } = useAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlansAndSubscription()
  }, [user])

  const loadPlansAndSubscription = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // プラン一覧を取得
      const availablePlans = stripeService.getAvailablePlans()
      setPlans(availablePlans)

      // 現在のサブスクリプションを取得
      if (user) {
        const subscription = await stripeService.getUserSubscription(user.uid)
        setCurrentSubscription(subscription)
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err)
      setError('サブスクリプション情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setError('ログインが必要です')
      return
    }

    try {
      setIsSubscribing(planId)
      setError(null)

      await stripeService.subscribeToPlan(user.uid, planId)
    } catch (err) {
      console.error('Subscription failed:', err)
      setError('サブスクリプションの申し込みに失敗しました')
    } finally {
      setIsSubscribing(null)
    }
  }

  const handleManageSubscription = async () => {
    if (!user) return

    try {
      await stripeService.redirectToCustomerPortal(user.uid)
    } catch (err) {
      console.error('Failed to redirect to customer portal:', err)
      setError('カスタマーポータルへの移動に失敗しました')
    }
  }

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return '無料'
    
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency
    })
    
    return `${formatter.format(price)}/${interval === 'month' ? '月' : '年'}`
  }

  const isCurrentPlan = (planId: string) => {
    if (planId === 'free') {
      return !currentSubscription || currentSubscription.status !== 'active'
    }
    return currentSubscription?.plan === planId && currentSubscription?.status === 'active'
  }

  const getPlanStatus = (planId: string) => {
    if (isCurrentPlan(planId)) {
      return '現在のプラン'
    }
    if (currentSubscription?.status === 'active' && planId === 'free') {
      return ''
    }
    return ''
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className={`subscription-plans ${className}`}>
      <div className="plans-header">
        <h2>プラン選択</h2>
        <p>あなたに最適なプランを選択してください</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${plan.isPopular ? 'popular' : ''} ${isCurrentPlan(plan.id) ? 'current' : ''}`}
          >
            {plan.isPopular && (
              <div className="popular-badge">
                <span>おすすめ</span>
              </div>
            )}

            <div className="plan-header">
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-price">
                {formatPrice(plan.price, plan.currency, plan.interval)}
              </div>
              {plan.interval === 'year' && plan.price > 0 && (
                <div className="savings">
                  2ヶ月分お得！
                </div>
              )}
            </div>

            <div className="plan-features">
              <h4>機能</h4>
              <ul>
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="check-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plan-actions">
              {isCurrentPlan(plan.id) ? (
                <>
                  <div className="current-plan-status">
                    {getPlanStatus(plan.id)}
                  </div>
                  {plan.id !== 'free' && (
                    <Button
                      onClick={handleManageSubscription}
                      variant="secondary"
                      size="sm"
                    >
                      プラン管理
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  variant={plan.isPopular ? 'primary' : 'secondary'}
                  isLoading={isSubscribing === plan.id}
                  disabled={!!isSubscribing || plan.id === 'free'}
                  className="subscribe-button"
                >
                  {isSubscribing === plan.id ? '処理中...' : 
                   plan.id === 'free' ? '無料プラン' : 'このプランを選ぶ'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentSubscription && (
        <div className="subscription-info">
          <h3>現在のサブスクリプション</h3>
          <div className="subscription-details">
            <div className="detail-item">
              <span className="label">プラン:</span>
              <span className="value">{currentSubscription.plan}</span>
            </div>
            <div className="detail-item">
              <span className="label">ステータス:</span>
              <span className={`value status ${currentSubscription.status}`}>
                {currentSubscription.status === 'active' ? 'アクティブ' :
                 currentSubscription.status === 'canceled' ? 'キャンセル済み' :
                 currentSubscription.status === 'past_due' ? '支払い遅延' :
                 currentSubscription.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">次回更新日:</span>
              <span className="value">{currentSubscription.currentPeriodEnd.toLocaleDateString()}</span>
            </div>
            {currentSubscription.cancelAtPeriodEnd && (
              <div className="detail-item">
                <span className="label">キャンセル予定:</span>
                <span className="value warning">期間終了時にキャンセルされます</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-plans {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .plans-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .plans-header h2 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 600;
        }

        .plans-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1.125rem;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--error-light);
          color: var(--error);
          border-radius: 0.5rem;
          border: 1px solid var(--error);
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .plan-card {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          border: 2px solid var(--border);
          position: relative;
          transition: all 0.3s ease;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .plan-card.popular {
          border-color: var(--primary);
          transform: scale(1.05);
        }

        .plan-card.current {
          border-color: var(--success);
          background: var(--success-light);
        }

        .popular-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--primary);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .plan-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .plan-header h3 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .plan-description {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .plan-price {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .savings {
          background: var(--success);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }

        .plan-features {
          margin-bottom: 2rem;
        }

        .plan-features h4 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 600;
        }

        .plan-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .check-icon {
          color: var(--success);
          font-weight: bold;
          flex-shrink: 0;
        }

        .plan-actions {
          text-align: center;
        }

        .current-plan-status {
          background: var(--success);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .subscribe-button {
          width: 100%;
          min-height: 48px;
        }

        .subscription-info {
          background: var(--background);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border);
        }

        .subscription-info h3 {
          margin: 0 0 1.5rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .subscription-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .status.active {
          color: var(--success);
        }

        .status.canceled {
          color: var(--error);
        }

        .status.past_due {
          color: var(--warning);
        }

        .value.warning {
          color: var(--warning);
        }

        @media (max-width: 768px) {
          .subscription-plans {
            padding: 1rem;
          }

          .plans-grid {
            grid-template-columns: 1fr;
          }

          .plan-card.popular {
            transform: none;
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  )
}