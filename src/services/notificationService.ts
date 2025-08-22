import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import type { Messaging } from 'firebase/messaging'
import firebaseService from './firebase'
import { getEnvVar } from '../utils/env'


export interface NotificationPreferences {
  streakReminder: boolean
  quizReminder: boolean
  heartRecovery: boolean
  badgeAchievement: boolean
  quietHoursStart: string // 'HH:mm' format
  quietHoursEnd: string // 'HH:mm' format
}

export interface NotificationSchedule {
  id: string
  type: 'streak' | 'quiz' | 'heart' | 'badge'
  title: string
  body: string
  scheduledAt: Date
  userId: string
  data?: Record<string, string>
}

export class NotificationService {
  private static instance: NotificationService
  private messaging: Messaging | null = null
  private vapidKey = getEnvVar('VITE_FIREBASE_VAPID_KEY')
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private constructor() {
    this.initializeMessaging()
  }

  private initializeMessaging() {
    try {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        this.messaging = getMessaging(firebaseService.getApp())
      }
    } catch (error) {
      console.warn('Firebase Messaging not available:', error)
    }
  }

  /**
   * 通知許可をリクエスト
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        throw new Error('ブラウザが通知をサポートしていません')
      }

      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  /**
   * 通知許可状態を確認
   */
  isPermissionGranted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted'
  }

  /**
   * FCMトークンを取得
   */
  async getRegistrationToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        throw new Error('Firebase Messaging not initialized')
      }

      if (!this.isPermissionGranted()) {
        const granted = await this.requestPermission()
        if (!granted) {
          throw new Error('通知許可が必要です')
        }
      }

      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      })

      return token
    } catch (error) {
      console.error('Failed to get FCM token:', error)
      return null
    }
  }

  /**
   * フォアグラウンド通知リスナーを設定
   */
  onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
    try {
      if (!this.messaging) {
        console.warn('Firebase Messaging not available')
        return null
      }

      return onMessage(this.messaging, callback)
    } catch (error) {
      console.error('Failed to set up foreground message listener:', error)
      return null
    }
  }

  /**
   * ローカル通知を表示（ブラウザAPI）
   */
  async showLocalNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    try {
      if (!this.isPermissionGranted()) {
        return
      }

      // 静寂時間チェック
      if (await this.isQuietTime()) {
        console.log('Notification suppressed due to quiet hours')
        return
      }

      new Notification(title, {
        icon: '/wine-icon-192.png',
        badge: '/wine-icon-192.png',
        ...options
      })
    } catch (error) {
      console.error('Failed to show local notification:', error)
    }
  }

  /**
   * 静寂時間チェック
   */
  private async isQuietTime(): Promise<boolean> {
    try {
      const settings = await this.getNotificationSettings()
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      return currentTime >= settings.quietHoursStart && currentTime <= settings.quietHoursEnd
    } catch (error) {
      // デフォルトの静寂時間: 22:00-08:00
      const now = new Date()
      const hour = now.getHours()
      return hour >= 22 || hour < 8
    }
  }

  /**
   * 通知設定を取得
   */
  async getNotificationSettings(): Promise<NotificationPreferences> {
    try {
      const firestore = firebaseService.getFirestore()
      const userDoc = firebaseService.getCurrentUser()
      
      if (!userDoc) {
        return this.getDefaultSettings()
      }

      const { doc, getDoc } = await import('firebase/firestore')
      const settingsDoc = await getDoc(doc(firestore, `users/${userDoc.uid}/settings/notifications`))
      
      if (settingsDoc.exists()) {
        return settingsDoc.data() as NotificationPreferences
      }
      
      return this.getDefaultSettings()
    } catch (error) {
      console.error('Failed to get notification settings:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * 通知設定を保存
   */
  async saveNotificationSettings(settings: NotificationPreferences): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const userDoc = firebaseService.getCurrentUser()
      
      if (!userDoc) {
        throw new Error('User not authenticated')
      }

      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(firestore, `users/${userDoc.uid}/settings/notifications`), settings)
      
    } catch (error) {
      console.error('Failed to save notification settings:', error)
      throw error
    }
  }

  /**
   * デフォルト設定
   */
  private getDefaultSettings(): NotificationPreferences {
    return {
      streakReminder: true,
      quizReminder: true,
      heartRecovery: true,
      badgeAchievement: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    }
  }

  /**
   * ストリーク継続リマインダー
   */
  async scheduleStreakReminder(userId: string): Promise<void> {
    const settings = await this.getNotificationSettings()
    if (!settings.streakReminder) return

    // 最後のアクティビティから23時間後にリマインダー
    const reminderTime = new Date()
    reminderTime.setHours(reminderTime.getHours() + 23)

    await this.showLocalNotification(
      'ストリーク継続のお時間です！',
      {
        body: 'ワインテイスティングやクイズでストリークを継続しましょう',
        data: { type: 'streak_reminder', userId }
      }
    )
  }

  /**
   * クイズリマインダー
   */
  async scheduleQuizReminder(userId: string): Promise<void> {
    const settings = await this.getNotificationSettings()
    if (!settings.quizReminder) return

    await this.showLocalNotification(
      'ワインクイズの時間です！',
      {
        body: '毎日のクイズでワインの知識を深めましょう',
        data: { type: 'quiz_reminder', userId }
      }
    )
  }

  /**
   * ハート回復通知
   */
  async notifyHeartRecovery(userId: string, heartsRecovered: number): Promise<void> {
    const settings = await this.getNotificationSettings()
    if (!settings.heartRecovery) return

    await this.showLocalNotification(
      'ハートが回復しました！',
      {
        body: `${heartsRecovered}個のハートが回復しました。クイズを再開できます`,
        data: { type: 'heart_recovery', userId, hearts: heartsRecovered.toString() }
      }
    )
  }

  /**
   * バッジ獲得通知
   */
  async notifyBadgeAchievement(userId: string, badgeName: string, badgeRarity: string): Promise<void> {
    const settings = await this.getNotificationSettings()
    if (!settings.badgeAchievement) return

    const rarityEmoji = this.getRarityEmoji(badgeRarity)
    
    await this.showLocalNotification(
      `${rarityEmoji} バッジ獲得！`,
      {
        body: `「${badgeName}」バッジを獲得しました！`,
        data: { type: 'badge_achievement', userId, badgeName, badgeRarity }
      }
    )
  }

  /**
   * レア度に応じた絵文字を取得
   */
  private getRarityEmoji(rarity: string): string {
    switch (rarity) {
      case 'legendary': return '👑'
      case 'epic': return '💎'
      case 'rare': return '⭐'
      case 'common': return '🏅'
      default: return '🎖️'
    }
  }

  /**
   * FCMトークンをサーバーに登録
   */
  async registerTokenToServer(userId: string): Promise<void> {
    try {
      const token = await this.getRegistrationToken()
      if (!token) return

      const firestore = firebaseService.getFirestore()
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      await setDoc(doc(firestore, `users/${userId}/fcmTokens/${token}`), {
        token,
        platform: this.getPlatform(),
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
        lastUsed: serverTimestamp()
      })

    } catch (error) {
      console.error('Failed to register FCM token:', error)
    }
  }

  /**
   * プラットフォーム識別
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('android')) return 'android'
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios'
    if (userAgent.includes('windows')) return 'windows'
    if (userAgent.includes('mac')) return 'mac'
    if (userAgent.includes('linux')) return 'linux'
    
    return 'unknown'
  }

  /**
   * 通知サービスの初期化
   */
  async initialize(userId: string): Promise<void> {
    try {
      // FCMトークンを登録
      await this.registerTokenToServer(userId)
      
      // フォアグラウンド通知リスナーを設定
      const unsubscribe = this.onForegroundMessage((payload) => {
        console.log('Foreground notification received:', payload)
        
        // フォアグラウンドで受信した通知をローカル通知として表示
        if (payload.notification) {
          this.showLocalNotification(
            payload.notification.title || 'MyWineMemory',
            {
              body: payload.notification.body,
              data: payload.data
            }
          )
        }
      })

      // アプリ終了時にリスナーを削除
      if (unsubscribe) {
        window.addEventListener('beforeunload', unsubscribe)
      }

    } catch (error) {
      console.error('Failed to initialize notification service:', error)
    }
  }
}

// シングルトンインスタンスをエクスポート
export const notificationService = NotificationService.getInstance()