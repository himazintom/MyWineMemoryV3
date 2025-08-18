import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import firebaseService from './firebase'
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore'

// サブスクリプション関連の型定義
export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
  isPopular?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  plan: string
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PaymentSession {
  sessionId: string
  customerId: string
  priceId: string
  mode: 'subscription' | 'payment'
  successUrl: string
  cancelUrl: string
}

class StripeService {
  private stripe: Stripe | null = null
  private readonly subscriptionCollection = 'subscriptions'

  /**
   * Stripeクライアントの初期化
   */
  async initialize(): Promise<void> {
    try {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
      
      if (!publishableKey) {
        throw new Error('Stripe publishable key not found')
      }

      this.stripe = await loadStripe(publishableKey)
      
      if (!this.stripe) {
        throw new Error('Failed to load Stripe')
      }

      console.log('Stripe initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Stripe:', error)
      throw error
    }
  }

  /**
   * 利用可能なプラン一覧を取得
   */
  getAvailablePlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'フリープラン',
        description: '基本的なワイン記録機能',
        price: 0,
        currency: 'JPY',
        interval: 'month',
        stripePriceId: '',
        features: [
          'ワイン記録：無制限',
          '画像アップロード：1枚/記録',
          'AI分析：月10回',
          'クイズ：全レベル対応',
          'オフライン対応',
          'データエクスポート'
        ]
      },
      {
        id: 'premium',
        name: 'プレミアムプラン',
        description: '高度な分析とプレミアム機能',
        price: 980,
        currency: 'JPY',
        interval: 'month',
        stripePriceId: process.env.VITE_STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly',
        isPopular: true,
        features: [
          'フリープランの全機能',
          '画像アップロード：4枚/記録',
          'AI分析：月100回',
          '高度統計分析',
          'プレミアムバッジ',
          '優先サポート',
          'データ自動バックアップ'
        ]
      },
      {
        id: 'premium_yearly',
        name: 'プレミアム年額プラン',
        description: '年額払いで2ヶ月分お得',
        price: 9800,
        currency: 'JPY',
        interval: 'year',
        stripePriceId: process.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
        features: [
          'プレミアムプランの全機能',
          '2ヶ月分お得（年額9,800円）',
          '年間統計レポート',
          'スペシャルバッジ'
        ]
      }
    ]
  }

  /**
   * チェックアウトセッションを作成
   */
  async createCheckoutSession(
    userId: string,
    priceId: string,
    mode: 'subscription' | 'payment' = 'subscription'
  ): Promise<{ sessionId: string }> {
    try {
      if (!this.stripe) {
        await this.initialize()
      }

      // Firebase Functionsのcheckout API を呼び出し
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseService.getCurrentUser()?.getIdToken()}`
        },
        body: JSON.stringify({
          userId,
          priceId,
          mode,
          successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      return { sessionId }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw new Error('チェックアウトセッションの作成に失敗しました')
    }
  }

  /**
   * チェックアウトセッションにリダイレクト
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    try {
      if (!this.stripe) {
        await this.initialize()
      }

      const { error } = await this.stripe!.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      throw new Error('チェックアウトページへの移動に失敗しました')
    }
  }

  /**
   * サブスクリプション購入フローを開始
   */
  async subscribeToPlan(userId: string, planId: string): Promise<void> {
    try {
      const plans = this.getAvailablePlans()
      const plan = plans.find(p => p.id === planId)
      
      if (!plan || plan.id === 'free') {
        throw new Error('Invalid plan selected')
      }

      // チェックアウトセッション作成
      const { sessionId } = await this.createCheckoutSession(
        userId,
        plan.stripePriceId,
        'subscription'
      )

      // チェックアウトページにリダイレクト
      await this.redirectToCheckout(sessionId)
    } catch (error) {
      console.error('Error subscribing to plan:', error)
      throw error
    }
  }

  /**
   * ユーザーのサブスクリプション情報を取得
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const subscriptionDoc = doc(firestore, this.subscriptionCollection, userId)
      const docSnap = await getDoc(subscriptionDoc)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      return {
        id: docSnap.id,
        userId: data.userId,
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        plan: data.plan,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart.toDate(),
        currentPeriodEnd: data.currentPeriodEnd.toDate(),
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        trialEnd: data.trialEnd?.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      }
    } catch (error) {
      console.error('Error getting user subscription:', error)
      return null
    }
  }

  /**
   * サブスクリプションのキャンセル
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseService.getCurrentUser()?.getIdToken()}`
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      console.log('Subscription cancelled successfully')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      throw new Error('サブスクリプションのキャンセルに失敗しました')
    }
  }

  /**
   * サブスクリプションの再開
   */
  async resumeSubscription(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/stripe/resume-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseService.getCurrentUser()?.getIdToken()}`
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        throw new Error('Failed to resume subscription')
      }

      console.log('Subscription resumed successfully')
    } catch (error) {
      console.error('Error resuming subscription:', error)
      throw new Error('サブスクリプションの再開に失敗しました')
    }
  }

  /**
   * カスタマーポータルにリダイレクト
   */
  async redirectToCustomerPortal(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await firebaseService.getCurrentUser()?.getIdToken()}`
        },
        body: JSON.stringify({
          userId,
          returnUrl: `${window.location.origin}/settings`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create customer portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error redirecting to customer portal:', error)
      throw new Error('カスタマーポータルへの移動に失敗しました')
    }
  }

  /**
   * サブスクリプション変更の監視
   */
  subscribeToSubscriptionChanges(
    userId: string,
    callback: (subscription: UserSubscription | null) => void
  ): () => void {
    const firestore = firebaseService.getFirestore()
    const subscriptionDoc = doc(firestore, this.subscriptionCollection, userId)
    
    return onSnapshot(subscriptionDoc, (doc) => {
      if (doc.exists()) {
        const data = doc.data()
        const subscription: UserSubscription = {
          id: doc.id,
          userId: data.userId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          plan: data.plan,
          status: data.status,
          currentPeriodStart: data.currentPeriodStart.toDate(),
          currentPeriodEnd: data.currentPeriodEnd.toDate(),
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          trialEnd: data.trialEnd?.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        }
        callback(subscription)
      } else {
        callback(null)
      }
    })
  }

  /**
   * プラン制限チェック
   */
  async checkPlanLimits(userId: string): Promise<{
    plan: string
    canUploadImages: boolean
    maxImagesPerRecord: number
    canUseLLM: boolean
    monthlyLLMLimit: number
    hasUnlimitedRecords: boolean
  }> {
    const subscription = await this.getUserSubscription(userId)
    const plan = subscription?.status === 'active' ? subscription.plan : 'free'
    
    const isPremium = plan === 'premium' || plan === 'premium_yearly'
    
    return {
      plan,
      canUploadImages: true,
      maxImagesPerRecord: isPremium ? 4 : 1,
      canUseLLM: true,
      monthlyLLMLimit: isPremium ? 100 : 10,
      hasUnlimitedRecords: true
    }
  }

  /**
   * 使用量の確認
   */
  async checkUsage(userId: string): Promise<{
    llmUsageThisMonth: number
    imagesUploadedToday: number
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // LLM使用回数を取得（今月）
      const llmQuery = query(
        collection(firestore, 'llmUsage'),
        where('userId', '==', userId),
        where('createdAt', '>=', monthStart)
      )
      const llmSnapshot = await getDocs(llmQuery)
      const llmUsageThisMonth = llmSnapshot.size

      // 画像アップロード数を取得（今日）
      const imageQuery = query(
        collection(firestore, 'imageUploads'),
        where('userId', '==', userId),
        where('createdAt', '>=', dayStart)
      )
      const imageSnapshot = await getDocs(imageQuery)
      const imagesUploadedToday = imageSnapshot.size

      return {
        llmUsageThisMonth,
        imagesUploadedToday
      }
    } catch (error) {
      console.error('Error checking usage:', error)
      return {
        llmUsageThisMonth: 0,
        imagesUploadedToday: 0
      }
    }
  }
}

export default new StripeService()