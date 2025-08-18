import firebaseService from './firebase'

export interface AppConfig {
  currentModel: string
  maintenanceMode: boolean
  maxUsersPerDay: number
  announcements: string[]
  updatedAt: Date
  updatedBy: string
}

export class AdminService {
  private static instance: AdminService
  private readonly configCollection = 'appConfig'
  private readonly configDocId = 'current'
  
  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService()
    }
    return AdminService.instance
  }

  private constructor() {}

  /**
   * 現在のアプリ設定を取得
   */
  async getAppConfig(): Promise<AppConfig | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const { doc, getDoc } = await import('firebase/firestore')
      
      const configRef = doc(firestore, this.configCollection, this.configDocId)
      const configDoc = await getDoc(configRef)
      
      if (configDoc.exists()) {
        const data = configDoc.data()
        return {
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as AppConfig
      }
      
      return null
    } catch (error) {
      console.error('Failed to get app config:', error)
      throw new Error('設定の取得に失敗しました')
    }
  }

  /**
   * 現在のLLMモデルを取得
   */
  async getCurrentModel(): Promise<string | null> {
    try {
      const config = await this.getAppConfig()
      return config?.currentModel || null
    } catch (error) {
      console.warn('Failed to get current model from config:', error)
      return null
    }
  }

  /**
   * LLMモデルを変更
   */
  async setCurrentModel(modelId: string, userId: string): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      const configRef = doc(firestore, this.configCollection, this.configDocId)
      
      await setDoc(configRef, {
        currentModel: modelId,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      }, { merge: true })
      
    } catch (error) {
      console.error('Failed to set current model:', error)
      throw new Error('モデル設定の保存に失敗しました')
    }
  }

  /**
   * アプリ設定を更新
   */
  async updateAppConfig(config: Partial<AppConfig>, userId: string): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      
      const configRef = doc(firestore, this.configCollection, this.configDocId)
      
      await setDoc(configRef, {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      }, { merge: true })
      
    } catch (error) {
      console.error('Failed to update app config:', error)
      throw new Error('設定の更新に失敗しました')
    }
  }

  /**
   * メンテナンスモードの切り替え
   */
  async setMaintenanceMode(enabled: boolean, userId: string): Promise<void> {
    await this.updateAppConfig({ maintenanceMode: enabled }, userId)
  }

  /**
   * お知らせの追加
   */
  async addAnnouncement(message: string, userId: string): Promise<void> {
    try {
      const config = await this.getAppConfig()
      const currentAnnouncements = config?.announcements || []
      
      await this.updateAppConfig({
        announcements: [message, ...currentAnnouncements].slice(0, 5) // 最新5件まで
      }, userId)
      
    } catch (error) {
      console.error('Failed to add announcement:', error)
      throw new Error('お知らせの追加に失敗しました')
    }
  }

  /**
   * 管理者権限チェック
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const firestore = firebaseService.getFirestore()
      const { doc, getDoc } = await import('firebase/firestore')
      
      const userRef = doc(firestore, 'users', userId)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        return userData.role === 'admin' || userData.isAdmin === true
      }
      
      return false
    } catch (error) {
      console.error('Failed to check admin status:', error)
      return false
    }
  }

  /**
   * 使用統計の取得
   */
  async getUsageStats(): Promise<{
    totalUsers: number
    activeUsers: number
    totalRecords: number
    apiUsage: number
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      const { collection, getDocs, query, where, Timestamp } = await import('firebase/firestore')
      
      // 過去30日のアクティブユーザー
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const [usersSnapshot, activeUsersSnapshot, recordsSnapshot] = await Promise.all([
        getDocs(collection(firestore, 'users')),
        getDocs(query(
          collection(firestore, 'users'),
          where('lastActivityDate', '>=', Timestamp.fromDate(thirtyDaysAgo))
        )),
        getDocs(collection(firestore, 'tastingRecords'))
      ])
      
      return {
        totalUsers: usersSnapshot.size,
        activeUsers: activeUsersSnapshot.size,
        totalRecords: recordsSnapshot.size,
        apiUsage: 0 // TODO: API使用量の統計を実装
      }
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      throw new Error('使用統計の取得に失敗しました')
    }
  }

  /**
   * リアルタイム設定監視
   */
  async subscribeToConfig(callback: (config: AppConfig | null) => void): Promise<() => void> {
    try {
      const firestore = firebaseService.getFirestore()
      const { doc, onSnapshot } = await import('firebase/firestore')
      
      const configRef = doc(firestore, this.configCollection, this.configDocId)
      
      return onSnapshot(configRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          callback({
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as AppConfig)
        } else {
          callback(null)
        }
      })
    } catch (error) {
      console.error('Failed to subscribe to config:', error)
      return () => {}
    }
  }
}

// シングルトンインスタンスをエクスポート
export const adminService = AdminService.getInstance()