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
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import firebaseService from './firebase'
import type { 
  QuizQuestion, 
  QuizProgress, 
  QuizAnswer, 
  QuizSession, 
  UserQuizStats 
} from '../types/quiz'

/**
 * クイズ管理サービス
 * クイズデータの読み込み、進捗管理、統計計算を担当
 */
class QuizService {
  private static instance: QuizService
  private readonly progressCollectionName = 'quizProgress'
  private readonly answersCollectionName = 'quizAnswers'
  private readonly sessionsCollectionName = 'quizSessions'
  private readonly statsCollectionName = 'userQuizStats'
  
  // レベル別クイズデータのキャッシュ
  private questionCache: Map<number, QuizQuestion[]> = new Map()

  private constructor() {}

  public static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService()
    }
    return QuizService.instance
  }

  // ===============================
  // クイズデータ読み込み
  // ===============================

  /**
   * レベル別クイズ問題の動的読み込み
   */
  async loadQuestionsForLevel(level: number): Promise<QuizQuestion[]> {
    try {
      // キャッシュチェック
      if (this.questionCache.has(level)) {
        return this.questionCache.get(level)!
      }

      // 動的インポート
      const levelPadded = level.toString().padStart(2, '0')
      const module = await import(`../data/quiz/levels/level${levelPadded}-${this.getLevelName(level)}.ts`)
      const questions: QuizQuestion[] = module.default || module.questions

      // IDと追加情報を設定
      const processedQuestions = questions.map((q, index) => ({
        ...q,
        id: q.id || `level${level}_q${index + 1}`,
        level,
        questionNumber: index + 1,
        difficulty: level
      }))

      // キャッシュに保存
      this.questionCache.set(level, processedQuestions)
      
      return processedQuestions
    } catch (error) {
      console.error(`Failed to load questions for level ${level}:`, error)
      throw new Error(`レベル${level}の問題読み込みに失敗しました`)
    }
  }

  /**
   * レベル名の取得（ファイル名用）
   */
  private getLevelName(level: number): string {
    const levelNames: Record<number, string> = {
      1: 'basic', 2: 'grapes', 3: 'tasting', 4: 'service', 5: 'pairing',
      6: 'france', 7: 'europe', 8: 'newworld', 9: 'production', 10: 'vintage',
      11: 'france-detail', 12: 'regulations', 13: 'pro-tasting', 14: 'rare', 15: 'business',
      16: 'history', 17: 'innovation', 18: 'investment', 19: 'spirits', 20: 'philosophy'
    }
    return levelNames[level] || 'unknown'
  }

  /**
   * ランダムな問題を取得（指定数）
   */
  async getRandomQuestions(level: number, count: number = 10): Promise<QuizQuestion[]> {
    const questions = await this.loadQuestionsForLevel(level)
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  // ===============================
  // 進捗管理
  // ===============================

  /**
   * ユーザーのレベル別進捗を取得
   */
  async getUserProgress(userId: string, level: number): Promise<QuizProgress | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const progressRef = doc(firestore, this.progressCollectionName, `${userId}_${level}`)
      const progressDoc = await getDoc(progressRef)

      if (progressDoc.exists()) {
        const data = progressDoc.data()
        return {
          ...data,
          lastHeartLoss: data.lastHeartLoss?.toDate(),
          nextHeartRecovery: data.nextHeartRecovery?.toDate(),
          completedAt: data.completedAt?.toDate(),
          lastPlayedAt: data.lastPlayedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as QuizProgress
      }

      return null
    } catch (error) {
      console.error('Failed to get user progress:', error)
      throw new Error(`進捗の取得に失敗しました: ${error}`)
    }
  }

  /**
   * ユーザーの全レベル進捗を取得
   */
  async getAllUserProgress(userId: string): Promise<QuizProgress[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.progressCollectionName),
        where('userId', '==', userId),
        orderBy('level', 'asc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          ...data,
          lastHeartLoss: data.lastHeartLoss?.toDate(),
          nextHeartRecovery: data.nextHeartRecovery?.toDate(),
          completedAt: data.completedAt?.toDate(),
          lastPlayedAt: data.lastPlayedAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as QuizProgress
      })
    } catch (error) {
      console.error('Failed to get all user progress:', error)
      throw new Error(`全進捗の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 進捗の初期化または作成
   */
  async initializeProgress(userId: string, level: number): Promise<QuizProgress> {
    try {
      const questions = await this.loadQuestionsForLevel(level)
      const firestore = firebaseService.getFirestore()
      const progressRef = doc(firestore, this.progressCollectionName, `${userId}_${level}`)

      const initialProgress: QuizProgress = {
        userId,
        level,
        completedQuestions: [],
        totalQuestions: questions.length,
        correctAnswers: 0,
        bestScore: 0,
        totalTime: 0,
        averageTime: 0,
        streak: 0,
        hearts: 5, // 初期ハート数
        isUnlocked: level === 1, // レベル1のみ最初からアンロック
        lastPlayedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(progressRef, {
        ...initialProgress,
        lastPlayedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return initialProgress
    } catch (error) {
      console.error('Failed to initialize progress:', error)
      throw new Error(`進捗の初期化に失敗しました: ${error}`)
    }
  }

  /**
   * 進捗の更新
   */
  async updateProgress(
    userId: string, 
    level: number, 
    updates: Partial<QuizProgress>
  ): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const progressRef = doc(firestore, this.progressCollectionName, `${userId}_${level}`)

      await updateDoc(progressRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to update progress:', error)
      throw new Error(`進捗の更新に失敗しました: ${error}`)
    }
  }

  // ===============================
  // ハートシステム
  // ===============================

  /**
   * ハートを消費
   */
  async consumeHeart(userId: string, level: number): Promise<boolean> {
    try {
      const progress = await this.getUserProgress(userId, level)
      
      if (!progress || progress.hearts <= 0) {
        return false // ハートが足りない
      }

      const now = new Date()
      const nextRecovery = new Date(now.getTime() + 30 * 60 * 1000) // 30分後

      await this.updateProgress(userId, level, {
        hearts: progress.hearts - 1,
        lastHeartLoss: now,
        nextHeartRecovery: nextRecovery
      })

      return true
    } catch (error) {
      console.error('Failed to consume heart:', error)
      return false
    }
  }

  /**
   * ハートの回復チェック
   */
  async checkHeartRecovery(userId: string, level: number): Promise<number> {
    try {
      const progress = await this.getUserProgress(userId, level)
      
      if (!progress || progress.hearts >= 5) {
        return progress?.hearts || 5
      }

      const now = new Date()
      const lastLoss = progress.lastHeartLoss || new Date(0)
      const minutesSinceLoss = Math.floor((now.getTime() - lastLoss.getTime()) / (1000 * 60))
      const heartsToRecover = Math.floor(minutesSinceLoss / 30) // 30分で1ハート回復

      if (heartsToRecover > 0) {
        const newHearts = Math.min(5, progress.hearts + heartsToRecover)
        await this.updateProgress(userId, level, {
          hearts: newHearts,
          nextHeartRecovery: newHearts >= 5 ? undefined : new Date(now.getTime() + 30 * 60 * 1000)
        })
        return newHearts
      }

      return progress.hearts
    } catch (error) {
      console.error('Failed to check heart recovery:', error)
      return 0
    }
  }

  // ===============================
  // 回答記録・セッション管理
  // ===============================

  /**
   * クイズセッションの開始
   */
  async startQuizSession(
    userId: string, 
    level: number, 
    questions: QuizQuestion[]
  ): Promise<QuizSession> {
    try {
      const firestore = firebaseService.getFirestore()
      const sessionRef = doc(collection(firestore, this.sessionsCollectionName))

      const session: QuizSession = {
        id: sessionRef.id,
        userId,
        level,
        startedAt: new Date(),
        totalQuestions: questions.length,
        correctAnswers: 0,
        score: 0,
        questions,
        answers: [],
        isCompleted: false,
        heartsLost: 0,
        xpEarned: 0,
        badgesEarned: []
      }

      await setDoc(sessionRef, {
        ...session,
        startedAt: serverTimestamp()
      })

      return session
    } catch (error) {
      console.error('Failed to start quiz session:', error)
      throw new Error(`クイズセッションの開始に失敗しました: ${error}`)
    }
  }

  /**
   * 回答の記録
   */
  async recordAnswer(
    sessionId: string,
    questionId: string,
    selectedAnswer: number,
    timeSpent: number
  ): Promise<QuizAnswer> {
    try {
      const firestore = firebaseService.getFirestore()
      const answerRef = doc(collection(firestore, this.answersCollectionName))

      // セッション情報を取得
      const sessionDoc = await getDoc(doc(firestore, this.sessionsCollectionName, sessionId))
      if (!sessionDoc.exists()) {
        throw new Error('Session not found')
      }

      const sessionData = sessionDoc.data() as QuizSession
      const question = sessionData.questions.find(q => q.id === questionId)
      if (!question) {
        throw new Error('Question not found in session')
      }

      const isCorrect = selectedAnswer === question.correctAnswer

      const answer: QuizAnswer = {
        id: answerRef.id,
        userId: sessionData.userId,
        questionId,
        level: sessionData.level,
        selectedAnswer,
        isCorrect,
        timeSpent,
        sessionId,
        answeredAt: new Date()
      }

      await setDoc(answerRef, {
        ...answer,
        answeredAt: serverTimestamp()
      })

      // セッションの回答リストを更新
      const batch = writeBatch(firestore)
      
      batch.update(doc(firestore, this.sessionsCollectionName, sessionId), {
        answers: [...sessionData.answers, answer],
        correctAnswers: isCorrect ? increment(1) : sessionData.correctAnswers
      })

      await batch.commit()

      return answer
    } catch (error) {
      console.error('Failed to record answer:', error)
      throw new Error(`回答の記録に失敗しました: ${error}`)
    }
  }

  /**
   * クイズセッションの終了
   */
  async completeQuizSession(sessionId: string): Promise<QuizSession> {
    try {
      const firestore = firebaseService.getFirestore()
      const sessionRef = doc(firestore, this.sessionsCollectionName, sessionId)
      const sessionDoc = await getDoc(sessionRef)

      if (!sessionDoc.exists()) {
        throw new Error('Session not found')
      }

      const sessionData = sessionDoc.data() as QuizSession
      const score = Math.round((sessionData.correctAnswers / sessionData.totalQuestions) * 100)
      const xpEarned = this.calculateXP(sessionData.correctAnswers, sessionData.level)

      await updateDoc(sessionRef, {
        endedAt: serverTimestamp(),
        isCompleted: true,
        score,
        xpEarned
      })

      // 進捗を更新
      await this.updateProgressFromSession(sessionData.userId, sessionData.level, {
        ...sessionData,
        score,
        xpEarned,
        isCompleted: true,
        endedAt: new Date()
      })

      return {
        ...sessionData,
        score,
        xpEarned,
        isCompleted: true,
        endedAt: new Date()
      }
    } catch (error) {
      console.error('Failed to complete quiz session:', error)
      throw new Error(`セッションの完了に失敗しました: ${error}`)
    }
  }

  /**
   * セッション結果から進捗を更新
   */
  private async updateProgressFromSession(
    userId: string, 
    level: number, 
    session: QuizSession
  ): Promise<void> {
    let progress = await this.getUserProgress(userId, level)
    
    if (!progress) {
      progress = await this.initializeProgress(userId, level)
    }

    const newCompletedQuestions = [...new Set([
      ...progress.completedQuestions,
      ...session.answers.filter(a => a.isCorrect).map(a => parseInt(a.questionId.split('_q')[1]))
    ])]

    const newBestScore = Math.max(progress.bestScore, session.score)
    const newCorrectAnswers = progress.correctAnswers + session.correctAnswers
    const newTotalTime = progress.totalTime + session.answers.reduce((sum, a) => sum + a.timeSpent, 0)

    await this.updateProgress(userId, level, {
      completedQuestions: newCompletedQuestions,
      correctAnswers: newCorrectAnswers,
      bestScore: newBestScore,
      totalTime: newTotalTime,
      averageTime: newTotalTime / (progress.completedQuestions.length + session.answers.length),
      lastPlayedAt: new Date(),
      completedAt: newCompletedQuestions.length >= progress.totalQuestions ? new Date() : undefined
    })

    // 次のレベルをアンロック
    if (newBestScore >= 80 && level < 20) {
      const nextProgress = await this.getUserProgress(userId, level + 1)
      if (!nextProgress) {
        await this.initializeProgress(userId, level + 1)
      } else if (!nextProgress.isUnlocked) {
        await this.updateProgress(userId, level + 1, { isUnlocked: true })
      }
    }
  }

  /**
   * XP計算
   */
  private calculateXP(correctAnswers: number, level: number): number {
    const baseXP = 5 // 1問正解あたりの基本XP
    const levelMultiplier = 1 + (level - 1) * 0.1 // レベルが上がるほど多くのXP
    return Math.round(correctAnswers * baseXP * levelMultiplier)
  }

  // ===============================
  // 統計・分析
  // ===============================

  /**
   * ユーザーの全体統計を取得
   */
  async getUserStats(userId: string): Promise<UserQuizStats | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const statsRef = doc(firestore, this.statsCollectionName, userId)
      const statsDoc = await getDoc(statsRef)

      if (statsDoc.exists()) {
        const data = statsDoc.data()
        return {
          ...data,
          streakStartDate: data.streakStartDate?.toDate(),
          lastReviewDate: data.lastReviewDate?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as UserQuizStats
      }

      return null
    } catch (error) {
      console.error('Failed to get user stats:', error)
      throw new Error(`統計の取得に失敗しました: ${error}`)
    }
  }

  /**
   * 統計の更新
   */
  async updateUserStats(userId: string, updates: Partial<UserQuizStats>): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const statsRef = doc(firestore, this.statsCollectionName, userId)

      await updateDoc(statsRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to update user stats:', error)
      throw new Error(`統計の更新に失敗しました: ${error}`)
    }
  }

  // ===============================
  // キャッシュ管理
  // ===============================

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.questionCache.clear()
  }

  /**
   * 特定レベルのキャッシュをクリア
   */
  clearLevelCache(level: number): void {
    this.questionCache.delete(level)
  }
}

// シングルトンインスタンスをエクスポート
export const quizService = QuizService.getInstance()
export default quizService