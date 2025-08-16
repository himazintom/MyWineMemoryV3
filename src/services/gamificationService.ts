import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore'
import firebaseService from './firebase'
import type {
  UserXP,
  XPRecord,
  XPSource,
  LevelUpRecord,
  Badge,
  BadgeRequirement,
  UserBadge,
  DailyGoal,
  UserStreak,
  ActivityRecord,
  ActivityType
} from '../types/gamification'

/**
 * ゲーミフィケーション管理サービス
 * XP、バッジ、ストリーク、日常目標の管理を担当
 */
class GamificationService {
  private static instance: GamificationService
  private readonly userXPCollectionName = 'userXP'
  private readonly xpRecordsCollectionName = 'xpRecords'
  private readonly badgesCollectionName = 'badges'
  private readonly userBadgesCollectionName = 'userBadges'
  private readonly dailyGoalsCollectionName = 'dailyGoals'
  private readonly userStreaksCollectionName = 'userStreaks'
  private readonly activityRecordsCollectionName = 'activityRecords'

  private constructor() {}

  public static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService()
    }
    return GamificationService.instance
  }

  // ===============================
  // XPシステム
  // ===============================

  /**
   * ユーザーのXP情報を取得
   */
  async getUserXP(userId: string): Promise<UserXP | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const xpRef = doc(firestore, this.userXPCollectionName, userId)
      const xpDoc = await getDoc(xpRef)

      if (xpDoc.exists()) {
        const data = xpDoc.data()
        return {
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as UserXP
      }

      return null
    } catch (error) {
      console.error('Failed to get user XP:', error)
      throw new Error(`XP情報の取得に失敗しました: ${error}`)
    }
  }

  /**
   * XPの初期化
   */
  async initializeUserXP(userId: string): Promise<UserXP> {
    try {
      const firestore = firebaseService.getFirestore()
      const xpRef = doc(firestore, this.userXPCollectionName, userId)

      const initialXP: UserXP = {
        userId,
        currentXP: 0,
        level: 1,
        xpToNextLevel: this.calculateXPForLevel(2),
        totalXPEarned: 0,
        xpHistory: [],
        levelHistory: [],
        updatedAt: new Date()
      }

      await setDoc(xpRef, {
        ...initialXP,
        updatedAt: serverTimestamp()
      })

      return initialXP
    } catch (error) {
      console.error('Failed to initialize user XP:', error)
      throw new Error(`XPの初期化に失敗しました: ${error}`)
    }
  }

  /**
   * XPを付与
   */
  async awardXP(
    userId: string,
    amount: number,
    source: XPSource,
    description: string,
    sourceId?: string
  ): Promise<{ newLevel?: number; xpRecord: XPRecord }> {
    try {
      const firestore = firebaseService.getFirestore()
      let userXP = await this.getUserXP(userId)

      if (!userXP) {
        userXP = await this.initializeUserXP(userId)
      }

      // XP記録を作成
      const xpRecordRef = doc(collection(firestore, this.xpRecordsCollectionName))
      const xpRecord: XPRecord = {
        id: xpRecordRef.id,
        userId,
        amount,
        source,
        sourceId,
        description,
        earnedAt: new Date()
      }

      // 新しいXP計算
      const newCurrentXP = userXP.currentXP + amount
      const newTotalXP = userXP.totalXPEarned + amount
      let newLevel = userXP.level
      let levelUpRecord: LevelUpRecord | null = null

      // レベルアップチェック
      while (newCurrentXP >= this.calculateXPForLevel(newLevel + 1)) {
        newLevel++
        levelUpRecord = {
          id: crypto.randomUUID(),
          userId,
          previousLevel: newLevel - 1,
          newLevel,
          xpAtLevelUp: newCurrentXP,
          achievedAt: new Date()
        }
      }

      const batch = writeBatch(firestore)

      // XP記録を保存
      batch.set(xpRecordRef, {
        ...xpRecord,
        earnedAt: serverTimestamp()
      })

      // ユーザーXPを更新
      const updatedXPHistory = [...userXP.xpHistory, xpRecord]
      const updatedLevelHistory = levelUpRecord ? [...userXP.levelHistory, levelUpRecord] : userXP.levelHistory

      batch.update(doc(firestore, this.userXPCollectionName, userId), {
        currentXP: newCurrentXP,
        level: newLevel,
        xpToNextLevel: this.calculateXPForLevel(newLevel + 1) - newCurrentXP,
        totalXPEarned: newTotalXP,
        xpHistory: updatedXPHistory,
        levelHistory: updatedLevelHistory,
        updatedAt: serverTimestamp()
      })

      await batch.commit()

      // レベルアップした場合はアクティビティ記録とバッジチェック
      if (levelUpRecord) {
        await this.recordActivity(userId, 'level_up', `レベル${newLevel}に到達！`, userId, {
          newLevel,
          previousLevel: levelUpRecord.previousLevel
        })
        
        await this.checkAndAwardBadges(userId)
      }

      return {
        newLevel: levelUpRecord ? newLevel : undefined,
        xpRecord
      }
    } catch (error) {
      console.error('Failed to award XP:', error)
      throw new Error(`XPの付与に失敗しました: ${error}`)
    }
  }

  /**
   * レベルに必要なXPを計算（指数進行、1.2倍）
   */
  private calculateXPForLevel(level: number): number {
    if (level <= 1) return 0
    const baseXP = 100
    return Math.floor(baseXP * Math.pow(1.2, level - 2))
  }

  // ===============================
  // バッジシステム
  // ===============================

  /**
   * すべてのバッジを取得
   */
  async getAllBadges(): Promise<Badge[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.badgesCollectionName),
        orderBy('sortOrder', 'asc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Badge
      })
    } catch (error) {
      console.error('Failed to get all badges:', error)
      throw new Error(`バッジ一覧の取得に失敗しました: ${error}`)
    }
  }

  /**
   * ユーザーが獲得したバッジを取得
   */
  async getUserBadges(userId: string): Promise<UserBadge[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.userBadgesCollectionName),
        where('userId', '==', userId),
        orderBy('earnedAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          earnedAt: data.earnedAt?.toDate() || new Date()
        } as UserBadge
      })
    } catch (error) {
      console.error('Failed to get user badges:', error)
      throw new Error(`ユーザーバッジの取得に失敗しました: ${error}`)
    }
  }

  /**
   * バッジ獲得条件をチェックして付与
   */
  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    try {
      const allBadges = await this.getAllBadges()
      const userBadges = await this.getUserBadges(userId)
      const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId))
      
      const newBadges: UserBadge[] = []

      for (const badge of allBadges) {
        if (earnedBadgeIds.has(badge.id)) continue

        const meetsRequirements = await this.checkBadgeRequirements(userId, badge.requirements)
        if (meetsRequirements) {
          const userBadge = await this.awardBadge(userId, badge)
          newBadges.push(userBadge)
        }
      }

      return newBadges
    } catch (error) {
      console.error('Failed to check and award badges:', error)
      throw new Error(`バッジチェックに失敗しました: ${error}`)
    }
  }

  /**
   * バッジ獲得条件をチェック
   */
  private async checkBadgeRequirements(userId: string, requirements: BadgeRequirement[]): Promise<boolean> {
    try {
      for (const requirement of requirements) {
        const meetsRequirement = await this.checkSingleRequirement(userId, requirement)
        if (!meetsRequirement) return false
      }
      return true
    } catch (error) {
      console.error('Failed to check badge requirements:', error)
      return false
    }
  }

  /**
   * 単一の獲得条件をチェック
   */
  private async checkSingleRequirement(userId: string, requirement: BadgeRequirement): Promise<boolean> {
    const firestore = firebaseService.getFirestore()

    switch (requirement.type) {
      case 'records_count': {
        const q = query(
          collection(firestore, 'tastingRecords'),
          where('userId', '==', userId)
        )
        const snapshot = await getDocs(q)
        return snapshot.size >= requirement.target
      }

      case 'quiz_correct': {
        const q = query(
          collection(firestore, 'quizAnswers'),
          where('userId', '==', userId),
          where('isCorrect', '==', true)
        )
        const snapshot = await getDocs(q)
        return snapshot.size >= requirement.target
      }

      case 'level_reached': {
        const userXP = await this.getUserXP(userId)
        return (userXP?.level || 1) >= requirement.target
      }

      case 'xp_earned': {
        const userXP = await this.getUserXP(userId)
        return (userXP?.totalXPEarned || 0) >= requirement.target
      }

      case 'streak_days': {
        const streak = await this.getUserStreak(userId)
        return (streak?.currentStreak || 0) >= requirement.target
      }

      default:
        return false
    }
  }

  /**
   * バッジを付与
   */
  private async awardBadge(userId: string, badge: Badge): Promise<UserBadge> {
    try {
      const firestore = firebaseService.getFirestore()
      const userBadgeRef = doc(collection(firestore, this.userBadgesCollectionName))

      const userBadge: UserBadge = {
        id: userBadgeRef.id,
        userId,
        badgeId: badge.id,
        badge,
        earnedAt: new Date()
      }

      await setDoc(userBadgeRef, {
        ...userBadge,
        earnedAt: serverTimestamp()
      })

      // バッジ獲得でXPを付与
      await this.awardXP(userId, 25, 'badge_earned', `バッジ「${badge.name}」を獲得`, badge.id)

      // アクティビティ記録
      await this.recordActivity(userId, 'badge_earned', `バッジ「${badge.name}」を獲得！`, badge.id, {
        badgeName: badge.name,
        badgeCategory: badge.category
      })

      return userBadge
    } catch (error) {
      console.error('Failed to award badge:', error)
      throw new Error(`バッジの付与に失敗しました: ${error}`)
    }
  }

  // ===============================
  // ストリーク管理
  // ===============================

  /**
   * ユーザーのストリーク情報を取得
   */
  async getUserStreak(userId: string): Promise<UserStreak | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const streakRef = doc(firestore, this.userStreaksCollectionName, userId)
      const streakDoc = await getDoc(streakRef)

      if (streakDoc.exists()) {
        const data = streakDoc.data()
        return {
          ...data,
          currentStreakStart: data.currentStreakStart?.toDate(),
          lastActivityDate: data.lastActivityDate?.toDate(),
          longestStreakStart: data.longestStreakStart?.toDate(),
          longestStreakEnd: data.longestStreakEnd?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as UserStreak
      }

      return null
    } catch (error) {
      console.error('Failed to get user streak:', error)
      throw new Error(`ストリーク情報の取得に失敗しました: ${error}`)
    }
  }

  /**
   * ストリークを更新
   */
  async updateStreak(userId: string, activityType: 'tasting' | 'quiz' | 'login'): Promise<UserStreak> {
    try {
      const firestore = firebaseService.getFirestore()
      let streak = await this.getUserStreak(userId)
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]

      if (!streak) {
        // 初回ストリーク作成
        streak = {
          userId,
          currentStreak: 1,
          currentStreakStart: today,
          lastActivityDate: today,
          longestStreak: 1,
          longestStreakStart: today,
          longestStreakEnd: today,
          tastingStreak: activityType === 'tasting' ? 1 : 0,
          quizStreak: activityType === 'quiz' ? 1 : 0,
          loginStreak: activityType === 'login' ? 1 : 0,
          updatedAt: today
        }
      } else {
        const lastActivityString = streak.lastActivityDate.toISOString().split('T')[0]
        
        if (lastActivityString === todayString) {
          // 同日の活動は更新しない
          return streak
        }

        const daysDiff = Math.floor((today.getTime() - streak.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff === 1) {
          // 連続活動
          streak.currentStreak++
          streak.lastActivityDate = today
          
          // アクティビティ別ストリーク更新
          if (activityType === 'tasting') streak.tastingStreak++
          if (activityType === 'quiz') streak.quizStreak++
          if (activityType === 'login') streak.loginStreak++
          
          // 最長記録更新
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak
            streak.longestStreakEnd = today
          }
        } else {
          // ストリーク途切れ
          streak.currentStreak = 1
          streak.currentStreakStart = today
          streak.lastActivityDate = today
          streak.tastingStreak = activityType === 'tasting' ? 1 : 0
          streak.quizStreak = activityType === 'quiz' ? 1 : 0
          streak.loginStreak = activityType === 'login' ? 1 : 0
        }
      }

      const streakRef = doc(firestore, this.userStreaksCollectionName, userId)
      await setDoc(streakRef, {
        ...streak,
        currentStreakStart: serverTimestamp(),
        lastActivityDate: serverTimestamp(),
        longestStreakStart: serverTimestamp(),
        longestStreakEnd: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })

      // ストリークマイルストーンチェック
      if (streak.currentStreak % 7 === 0) { // 7日ごと
        await this.awardXP(
          userId,
          40 + (streak.currentStreak / 7) * 10,
          'streak_milestone',
          `${streak.currentStreak}日連続ストリーク達成！`
        )
      }

      return streak
    } catch (error) {
      console.error('Failed to update streak:', error)
      throw new Error(`ストリークの更新に失敗しました: ${error}`)
    }
  }

  // ===============================
  // 日常目標
  // ===============================

  /**
   * 今日の目標を取得
   */
  async getTodayGoals(userId: string): Promise<DailyGoal | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const today = new Date().toISOString().split('T')[0]
      const goalRef = doc(firestore, this.dailyGoalsCollectionName, `${userId}_${today}`)
      const goalDoc = await getDoc(goalRef)

      if (goalDoc.exists()) {
        const data = goalDoc.data()
        return {
          ...data,
          completedAt: data.completedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as DailyGoal
      }

      return null
    } catch (error) {
      console.error('Failed to get today goals:', error)
      throw new Error(`日常目標の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 日常目標を作成
   */
  async createDailyGoals(
    userId: string,
    tastingTarget: number = 1,
    quizTarget: number = 5
  ): Promise<DailyGoal> {
    try {
      const firestore = firebaseService.getFirestore()
      const today = new Date().toISOString().split('T')[0]
      const goalRef = doc(firestore, this.dailyGoalsCollectionName, `${userId}_${today}`)

      const goal: DailyGoal = {
        id: `${userId}_${today}`,
        userId,
        date: today,
        tastingRecordsTarget: tastingTarget,
        quizQuestionsTarget: quizTarget,
        tastingRecordsCompleted: 0,
        quizQuestionsCompleted: 0,
        isCompleted: false,
        bonusXPEarned: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(goalRef, {
        ...goal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return goal
    } catch (error) {
      console.error('Failed to create daily goals:', error)
      throw new Error(`日常目標の作成に失敗しました: ${error}`)
    }
  }

  /**
   * 日常目標の進捗を更新
   */
  async updateGoalProgress(
    userId: string,
    type: 'tasting' | 'quiz',
    increment: number = 1
  ): Promise<DailyGoal | null> {
    try {
      let goal = await this.getTodayGoals(userId)
      
      if (!goal) {
        goal = await this.createDailyGoals(userId)
      }

      const firestore = firebaseService.getFirestore()
      const goalRef = doc(firestore, this.dailyGoalsCollectionName, goal.id)

      const updates: any = { updatedAt: serverTimestamp() }

      if (type === 'tasting') {
        updates.tastingRecordsCompleted = goal.tastingRecordsCompleted + increment
      } else if (type === 'quiz') {
        updates.quizQuestionsCompleted = goal.quizQuestionsCompleted + increment
      }

      // 目標達成チェック
      const newTastingCompleted = updates.tastingRecordsCompleted || goal.tastingRecordsCompleted
      const newQuizCompleted = updates.quizQuestionsCompleted || goal.quizQuestionsCompleted

      if (!goal.isCompleted && 
          newTastingCompleted >= goal.tastingRecordsTarget && 
          newQuizCompleted >= goal.quizQuestionsTarget) {
        updates.isCompleted = true
        updates.completedAt = serverTimestamp()
        updates.bonusXPEarned = 30

        // ボーナスXPを付与
        await this.awardXP(userId, 30, 'daily_goal_achieved', '日常目標を達成！')
        
        // アクティビティ記録
        await this.recordActivity(userId, 'goal_achieved', '日常目標を達成しました！', goal.id)
      }

      await updateDoc(goalRef, updates)

      return { ...goal, ...updates, completedAt: updates.completedAt?.toDate() }
    } catch (error) {
      console.error('Failed to update goal progress:', error)
      throw new Error(`目標進捗の更新に失敗しました: ${error}`)
    }
  }

  // ===============================
  // アクティビティ記録
  // ===============================

  /**
   * アクティビティを記録
   */
  async recordActivity(
    userId: string,
    type: ActivityType,
    description: string,
    relatedId?: string,
    metadata?: Record<string, any>
  ): Promise<ActivityRecord> {
    try {
      const firestore = firebaseService.getFirestore()
      const activityRef = doc(collection(firestore, this.activityRecordsCollectionName))

      const activity: ActivityRecord = {
        id: activityRef.id,
        userId,
        type,
        description,
        relatedId,
        metadata,
        createdAt: new Date()
      }

      await setDoc(activityRef, {
        ...activity,
        createdAt: serverTimestamp()
      })

      return activity
    } catch (error) {
      console.error('Failed to record activity:', error)
      throw new Error(`アクティビティの記録に失敗しました: ${error}`)
    }
  }

  /**
   * ユーザーのアクティビティ履歴を取得
   */
  async getUserActivities(userId: string, limitCount: number = 20): Promise<ActivityRecord[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.activityRecordsCollectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as ActivityRecord
      })
    } catch (error) {
      console.error('Failed to get user activities:', error)
      throw new Error(`アクティビティ履歴の取得に失敗しました: ${error}`)
    }
  }
}

// シングルトンインスタンスをエクスポート
export const gamificationService = GamificationService.getInstance()
export default gamificationService