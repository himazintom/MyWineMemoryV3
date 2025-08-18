import stripeService from './stripeService'
import { addDoc, collection } from 'firebase/firestore'
import firebaseService from './firebase'

/**
 * サブスクリプション制限チェック・ガード機能
 * 機能の実行前に制限をチェックし、使用量を記録
 */
class SubscriptionGuardService {
  /**
   * 画像アップロード制限チェック
   */
  async checkImageUploadPermission(userId: string, imageCount: number = 1): Promise<{
    allowed: boolean
    message?: string
    upgradeRequired?: boolean
  }> {
    try {
      const limits = await stripeService.checkPlanLimits(userId)
      
      if (!limits.canUploadImages) {
        return {
          allowed: false,
          message: '画像アップロード機能が利用できません',
          upgradeRequired: true
        }
      }

      if (imageCount > limits.maxImagesPerRecord) {
        const isPremium = limits.plan === 'premium' || limits.plan === 'premium_yearly'
        return {
          allowed: false,
          message: `1つの記録につき最大${limits.maxImagesPerRecord}枚まで画像をアップロードできます`,
          upgradeRequired: !isPremium
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Image upload permission check failed:', error)
      return {
        allowed: false,
        message: 'サーバーエラーが発生しました'
      }
    }
  }

  /**
   * LLM使用制限チェック
   */
  async checkLLMUsagePermission(userId: string): Promise<{
    allowed: boolean
    message?: string
    upgradeRequired?: boolean
    remainingUsage?: number
  }> {
    try {
      const [limits, usage] = await Promise.all([
        stripeService.checkPlanLimits(userId),
        stripeService.checkUsage(userId)
      ])

      if (!limits.canUseLLM) {
        return {
          allowed: false,
          message: 'AI分析機能が利用できません',
          upgradeRequired: true
        }
      }

      const remainingUsage = limits.monthlyLLMLimit - usage.llmUsageThisMonth
      
      if (remainingUsage <= 0) {
        const isPremium = limits.plan === 'premium' || limits.plan === 'premium_yearly'
        return {
          allowed: false,
          message: `今月のAI分析回数の上限(${limits.monthlyLLMLimit}回)に達しました`,
          upgradeRequired: !isPremium,
          remainingUsage: 0
        }
      }

      return { 
        allowed: true, 
        remainingUsage 
      }
    } catch (error) {
      console.error('LLM usage permission check failed:', error)
      return {
        allowed: false,
        message: 'サーバーエラーが発生しました'
      }
    }
  }

  /**
   * 記録作成制限チェック（将来的な拡張用）
   */
  async checkRecordCreationPermission(userId: string): Promise<{
    allowed: boolean
    message?: string
    upgradeRequired?: boolean
  }> {
    try {
      const limits = await stripeService.checkPlanLimits(userId)
      
      if (!limits.hasUnlimitedRecords) {
        // 将来的にレコード数制限を追加する場合の処理
        return {
          allowed: false,
          message: '記録数の上限に達しました',
          upgradeRequired: true
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Record creation permission check failed:', error)
      return {
        allowed: false,
        message: 'サーバーエラーが発生しました'
      }
    }
  }

  /**
   * LLM使用量を記録
   */
  async recordLLMUsage(userId: string, feature: string, tokens?: number): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      
      await addDoc(collection(firestore, 'llmUsage'), {
        userId,
        feature,
        tokens: tokens || 0,
        createdAt: new Date()
      })

      console.log(`LLM usage recorded for user ${userId}, feature: ${feature}`)
    } catch (error) {
      console.error('Failed to record LLM usage:', error)
    }
  }

  /**
   * 画像アップロード記録
   */
  async recordImageUpload(userId: string, imageCount: number = 1): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      
      for (let i = 0; i < imageCount; i++) {
        await addDoc(collection(firestore, 'imageUploads'), {
          userId,
          createdAt: new Date()
        })
      }

      console.log(`Image upload recorded for user ${userId}, count: ${imageCount}`)
    } catch (error) {
      console.error('Failed to record image upload:', error)
    }
  }

  /**
   * プレミアム機能チェック（汎用）
   */
  async checkPremiumFeatureAccess(userId: string, featureName: string): Promise<{
    allowed: boolean
    message?: string
    upgradeRequired?: boolean
  }> {
    try {
      const limits = await stripeService.checkPlanLimits(userId)
      const isPremium = limits.plan === 'premium' || limits.plan === 'premium_yearly'
      
      // プレミアム限定機能の定義
      const premiumFeatures = [
        'advanced_statistics',
        'data_backup',
        'priority_support',
        'export_detailed_reports',
        'heart_system_premium',
        'custom_tags',
        'wine_collection_management'
      ]

      if (premiumFeatures.includes(featureName) && !isPremium) {
        return {
          allowed: false,
          message: `${featureName}はプレミアム機能です`,
          upgradeRequired: true
        }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Premium feature access check failed:', error)
      return {
        allowed: false,
        message: 'サーバーエラーが発生しました'
      }
    }
  }

  /**
   * 制限エラー表示用のメッセージ生成
   */
  generateUpgradeMessage(feature: string, currentPlan: string): string {
    const messages = {
      image_upload: {
        free: 'プレミアムプランでは1つの記録につき最大4枚の画像をアップロードできます',
        premium: '画像アップロード機能をご利用いただけます'
      },
      llm_analysis: {
        free: 'プレミアムプランでは月100回のAI分析をご利用いただけます',
        premium: 'AI分析機能を無制限でご利用いただけます'
      },
      advanced_features: {
        free: 'プレミアムプランで高度な機能をご利用いただけます',
        premium: '全ての機能をご利用いただけます'
      }
    }

    const featureMessages = messages[feature as keyof typeof messages]
    if (featureMessages) {
      return featureMessages[currentPlan as keyof typeof featureMessages] || featureMessages.free
    }

    return 'プレミアムプランにアップグレードして全ての機能をご利用ください'
  }

  /**
   * 制限に達した際のアクション提案
   */
  getSuggestedActions(limitation: string): Array<{
    action: string
    label: string
    description: string
  }> {
    const actionMap = {
      llm_limit_reached: [
        {
          action: 'upgrade_premium',
          label: 'プレミアムプランにアップグレード',
          description: '月100回のAI分析が利用可能になります'
        },
        {
          action: 'wait_next_month',
          label: '来月まで待つ',
          description: '来月1日に使用回数がリセットされます'
        }
      ],
      image_limit_reached: [
        {
          action: 'upgrade_premium',
          label: 'プレミアムプランにアップグレード',
          description: '1つの記録につき4枚まで画像をアップロード可能'
        },
        {
          action: 'reduce_images',
          label: '画像数を減らす',
          description: '重要な画像のみを選択してアップロード'
        }
      ],
      premium_feature_locked: [
        {
          action: 'upgrade_premium',
          label: 'プレミアムプランにアップグレード',
          description: '全ての機能が利用可能になります'
        },
        {
          action: 'explore_free_features',
          label: 'フリープランの機能を活用',
          description: '基本的な記録機能は無制限でご利用いただけます'
        }
      ]
    }

    return actionMap[limitation as keyof typeof actionMap] || []
  }
}

export default new SubscriptionGuardService()