import { collection, addDoc, getDocs, updateDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { firebaseService } from './firebase'

export interface UserActivity {
  id?: string
  userId: string
  action: 'login' | 'logout' | 'record_created' | 'record_updated' | 'quiz_completed' | 'page_view' | 'feature_used'
  target?: string
  metadata?: Record<string, any>
  timestamp: Timestamp
  sessionId: string
}

export interface KPIMetrics {
  // Daily Active Users
  dau: number
  // Monthly Active Users
  mau: number
  // Total registered users
  totalUsers: number
  // Total wine records
  totalRecords: number
  // Average records per user
  avgRecordsPerUser: number
  // Quiz completion rate
  quizCompletionRate: number
  // User retention (7-day)
  retentionRate7d: number
  // Feature usage stats
  featureUsage: Record<string, number>
  // Most popular wine types
  popularWineTypes: Array<{ type: string; count: number }>
  // Average session duration (minutes)
  avgSessionDuration: number
}

export interface SessionData {
  sessionId: string
  userId: string
  startTime: Timestamp
  lastActivity: Timestamp
  pageViews: number
  actions: number
}

class AnalyticsService {
  private currentSessionId: string | null = null
  private sessionStartTime: Date | null = null

  // セッション開始
  async startSession(userId: string): Promise<string> {
    this.currentSessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.sessionStartTime = new Date()
    
    const sessionData: Omit<SessionData, 'id'> = {
      sessionId: this.currentSessionId,
      userId,
      startTime: Timestamp.fromDate(this.sessionStartTime),
      lastActivity: Timestamp.fromDate(this.sessionStartTime),
      pageViews: 0,
      actions: 0
    }

    try {
      await addDoc(collection(firebaseService.getFirestore(), 'analytics_sessions'), sessionData)
      await this.trackActivity(userId, 'login')
    } catch (error) {
      console.error('Failed to start analytics session:', error)
    }

    return this.currentSessionId
  }

  // セッション終了
  async endSession(userId: string): Promise<void> {
    if (!this.currentSessionId) return

    try {
      await this.trackActivity(userId, 'logout')
      this.currentSessionId = null
      this.sessionStartTime = null
    } catch (error) {
      console.error('Failed to end analytics session:', error)
    }
  }

  // アクティビティ追跡
  async trackActivity(
    userId: string, 
    action: UserActivity['action'],
    target?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.currentSessionId) {
      // セッションが開始されていない場合は自動開始
      await this.startSession(userId)
    }

    const activity: Omit<UserActivity, 'id'> = {
      userId,
      action,
      target,
      metadata,
      timestamp: Timestamp.now(),
      sessionId: this.currentSessionId!
    }

    try {
      await addDoc(collection(firebaseService.getFirestore(), 'analytics_activities'), activity)
      
      // セッションデータを更新
      await this.updateSessionActivity(userId)
    } catch (error) {
      console.error('Failed to track activity:', error)
    }
  }

  // ページビュー追跡
  async trackPageView(userId: string, pageName: string): Promise<void> {
    await this.trackActivity(userId, 'page_view', pageName)
  }

  // 機能使用追跡
  async trackFeatureUsage(userId: string, featureName: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackActivity(userId, 'feature_used', featureName, metadata)
  }

  // セッションアクティビティ更新
  private async updateSessionActivity(_userId: string): Promise<void> {
    if (!this.currentSessionId) return

    try {
      const sessionsRef = collection(firebaseService.getFirestore(), 'analytics_sessions')
      const q = query(
        sessionsRef,
        where('sessionId', '==', this.currentSessionId),
        limit(1)
      )
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0]
        await updateDoc(sessionDoc.ref, {
          lastActivity: Timestamp.now(),
          actions: (sessionDoc.data().actions || 0) + 1
        })
      }
    } catch (error) {
      console.error('Failed to update session activity:', error)
    }
  }

  // KPI計算
  async calculateKPIs(): Promise<KPIMetrics> {
    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // DAU計算
      const dauQuery = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('timestamp', '>=', Timestamp.fromDate(yesterday)),
        where('action', '==', 'login')
      )
      const dauSnapshot = await getDocs(dauQuery)
      const dau = new Set(dauSnapshot.docs.map(doc => doc.data().userId)).size

      // MAU計算
      const mauQuery = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('timestamp', '>=', Timestamp.fromDate(lastMonth)),
        where('action', '==', 'login')
      )
      const mauSnapshot = await getDocs(mauQuery)
      const mau = new Set(mauSnapshot.docs.map(doc => doc.data().userId)).size

      // 総ユーザー数
      const usersSnapshot = await getDocs(collection(firebaseService.getFirestore(), 'users'))
      const totalUsers = usersSnapshot.size

      // 総記録数
      const recordsSnapshot = await getDocs(collection(firebaseService.getFirestore(), 'tasting_records'))
      const totalRecords = recordsSnapshot.size

      // 平均記録数
      const avgRecordsPerUser = totalUsers > 0 ? totalRecords / totalUsers : 0

      // クイズ完了率計算
      const quizActivities = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('action', '==', 'quiz_completed'),
        where('timestamp', '>=', Timestamp.fromDate(lastMonth))
      )
      const quizSnapshot = await getDocs(quizActivities)
      const quizCompletions = quizSnapshot.size
      const quizCompletionRate = mau > 0 ? (quizCompletions / mau) * 100 : 0

      // 7日間リテンション率計算
      const retentionUsers = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('timestamp', '>=', Timestamp.fromDate(last7Days)),
        where('action', '==', 'login')
      )
      const retentionSnapshot = await getDocs(retentionUsers)
      const activeUsersLast7Days = new Set(retentionSnapshot.docs.map(doc => doc.data().userId)).size
      const retentionRate7d = totalUsers > 0 ? (activeUsersLast7Days / totalUsers) * 100 : 0

      // 機能使用統計
      const featureQuery = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('action', '==', 'feature_used'),
        where('timestamp', '>=', Timestamp.fromDate(lastMonth))
      )
      const featureSnapshot = await getDocs(featureQuery)
      const featureUsage: Record<string, number> = {}
      featureSnapshot.docs.forEach(doc => {
        const target = doc.data().target
        if (target) {
          featureUsage[target] = (featureUsage[target] || 0) + 1
        }
      })

      // 人気ワインタイプ
      const wineTypes: Record<string, number> = {}
      recordsSnapshot.docs.forEach(doc => {
        const wineType = doc.data().wineType
        if (wineType) {
          wineTypes[wineType] = (wineTypes[wineType] || 0) + 1
        }
      })
      const popularWineTypes = Object.entries(wineTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // 平均セッション時間計算
      const sessionsSnapshot = await getDocs(collection(firebaseService.getFirestore(), 'analytics_sessions'))
      let totalSessionDuration = 0
      let sessionCount = 0
      
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.startTime && data.lastActivity) {
          const duration = data.lastActivity.toDate().getTime() - data.startTime.toDate().getTime()
          totalSessionDuration += duration
          sessionCount++
        }
      })
      
      const avgSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount / (1000 * 60) : 0

      return {
        dau,
        mau,
        totalUsers,
        totalRecords,
        avgRecordsPerUser: Math.round(avgRecordsPerUser * 100) / 100,
        quizCompletionRate: Math.round(quizCompletionRate * 100) / 100,
        retentionRate7d: Math.round(retentionRate7d * 100) / 100,
        featureUsage,
        popularWineTypes,
        avgSessionDuration: Math.round(avgSessionDuration * 100) / 100
      }
    } catch (error) {
      console.error('Failed to calculate KPIs:', error)
      throw error
    }
  }

  // ユーザー個別分析  
  async getUserAnalytics(_userId: string, days: number = 30): Promise<{
    totalActivities: number
    sessionCount: number
    averageSessionDuration: number
    mostUsedFeatures: Array<{ feature: string; count: number }>
    activityTimeline: Array<{ date: string; activities: number }>
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      
      // ユーザーのアクティビティ取得
      const activitiesQuery = query(
        collection(firebaseService.getFirestore(), 'analytics_activities'),
        where('userId', '==', _userId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      )
      const activitiesSnapshot = await getDocs(activitiesQuery)
      
      // セッション取得
      const sessionsQuery = query(
        collection(firebaseService.getFirestore(), 'analytics_sessions'),
        where('userId', '==', _userId),
        where('startTime', '>=', Timestamp.fromDate(startDate))
      )
      const sessionsSnapshot = await getDocs(sessionsQuery)

      // セッション時間計算
      let totalSessionDuration = 0
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.startTime && data.lastActivity) {
          const duration = data.lastActivity.toDate().getTime() - data.startTime.toDate().getTime()
          totalSessionDuration += duration
        }
      })
      const averageSessionDuration = sessionsSnapshot.size > 0 ? 
        totalSessionDuration / sessionsSnapshot.size / (1000 * 60) : 0

      // 機能使用頻度
      const featureUsage: Record<string, number> = {}
      activitiesSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.action === 'feature_used' && data.target) {
          featureUsage[data.target] = (featureUsage[data.target] || 0) + 1
        }
      })
      const mostUsedFeatures = Object.entries(featureUsage)
        .map(([feature, count]) => ({ feature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // アクティビティタイムライン
      const activityByDate: Record<string, number> = {}
      activitiesSnapshot.docs.forEach(doc => {
        const date = doc.data().timestamp.toDate().toISOString().split('T')[0]
        activityByDate[date] = (activityByDate[date] || 0) + 1
      })
      const activityTimeline = Object.entries(activityByDate)
        .map(([date, activities]) => ({ date, activities }))
        .sort((a, b) => a.date.localeCompare(b.date))

      return {
        totalActivities: activitiesSnapshot.size,
        sessionCount: sessionsSnapshot.size,
        averageSessionDuration: Math.round(averageSessionDuration * 100) / 100,
        mostUsedFeatures,
        activityTimeline
      }
    } catch (error) {
      console.error('Failed to get user analytics:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService()