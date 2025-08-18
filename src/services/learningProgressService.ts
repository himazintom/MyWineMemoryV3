import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore'
import firebaseService from './firebase'
import type { QuizQuestion } from '../types'

// 学習進捗の型定義
export interface LearningProgress {
  userId: string
  level: number
  totalQuestions: number
  correctAnswers: number
  wrongAnswers: number
  accuracy: number
  streak: number
  bestStreak: number
  lastAttemptDate: Date
  reviewQuestions: ReviewQuestion[]
  masteredQuestions: string[]
  strugglingQuestions: string[]
  createdAt: Date
  updatedAt: Date
}

// 復習問題の型定義
export interface ReviewQuestion {
  questionId: string
  level: number
  lastAttempt: Date
  attemptCount: number
  correctCount: number
  wrongCount: number
  nextReviewDate: Date
  difficulty: number
  masteryLevel: 'learning' | 'reviewing' | 'mastered'
}

// 間隔反復学習の設定
const SPACED_REPETITION_INTERVALS = [
  1,    // 1日後
  3,    // 3日後
  7,    // 1週間後
  14,   // 2週間後
  30,   // 1ヶ月後
  90    // 3ヶ月後
]

class LearningProgressService {
  private readonly progressCollectionName = 'learningProgress'

  /**
   * 学習進捗の初期化
   */
  async initializeProgress(userId: string, level: number): Promise<LearningProgress> {
    try {
      const firestore = firebaseService.getFirestore()
      const progressId = `${userId}_${level}`
      const progressRef = doc(firestore, this.progressCollectionName, progressId)

      const initialProgress: LearningProgress = {
        userId,
        level,
        totalQuestions: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        accuracy: 0,
        streak: 0,
        bestStreak: 0,
        lastAttemptDate: new Date(),
        reviewQuestions: [],
        masteredQuestions: [],
        strugglingQuestions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await setDoc(progressRef, {
        ...initialProgress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      return initialProgress
    } catch (error) {
      console.error('Failed to initialize learning progress:', error)
      throw new Error(`学習進捗の初期化に失敗しました: ${error}`)
    }
  }

  /**
   * 学習進捗の取得
   */
  async getProgress(userId: string, level: number): Promise<LearningProgress | null> {
    try {
      const firestore = firebaseService.getFirestore()
      const progressId = `${userId}_${level}`
      const progressRef = doc(firestore, this.progressCollectionName, progressId)
      const snapshot = await getDoc(progressRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        ...data,
        lastAttemptDate: data.lastAttemptDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        reviewQuestions: data.reviewQuestions?.map((q: any) => ({
          ...q,
          lastAttempt: q.lastAttempt?.toDate() || new Date(),
          nextReviewDate: q.nextReviewDate?.toDate() || new Date()
        })) || []
      } as LearningProgress
    } catch (error) {
      console.error('Failed to get learning progress:', error)
      return null
    }
  }

  /**
   * 回答を記録して進捗を更新
   */
  async recordAnswer(
    userId: string,
    level: number,
    questionId: string,
    isCorrect: boolean,
    question: QuizQuestion
  ): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const progressId = `${userId}_${level}`
      const progressRef = doc(firestore, this.progressCollectionName, progressId)

      // 現在の進捗を取得
      let progress = await this.getProgress(userId, level)
      if (!progress) {
        progress = await this.initializeProgress(userId, level)
      }

      // 統計を更新
      progress.totalQuestions++
      if (isCorrect) {
        progress.correctAnswers++
        progress.streak++
        if (progress.streak > progress.bestStreak) {
          progress.bestStreak = progress.streak
        }
      } else {
        progress.wrongAnswers++
        progress.streak = 0
      }
      progress.accuracy = progress.correctAnswers / progress.totalQuestions * 100
      progress.lastAttemptDate = new Date()

      // 復習問題の管理
      const reviewQuestion = this.updateReviewQuestion(
        progress.reviewQuestions,
        questionId,
        level,
        isCorrect,
        question.difficulty
      )

      // マスター/苦手問題の分類
      if (reviewQuestion.masteryLevel === 'mastered' && 
          !progress.masteredQuestions.includes(questionId)) {
        progress.masteredQuestions.push(questionId)
        progress.strugglingQuestions = progress.strugglingQuestions.filter(id => id !== questionId)
      } else if (reviewQuestion.correctCount === 0 && reviewQuestion.attemptCount >= 3 &&
                 !progress.strugglingQuestions.includes(questionId)) {
        progress.strugglingQuestions.push(questionId)
      }

      // Firestoreに保存
      await updateDoc(progressRef, {
        ...progress,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to record answer:', error)
      throw new Error(`回答の記録に失敗しました: ${error}`)
    }
  }

  /**
   * 復習問題の更新（間隔反復学習アルゴリズム）
   */
  private updateReviewQuestion(
    reviewQuestions: ReviewQuestion[],
    questionId: string,
    level: number,
    isCorrect: boolean,
    difficulty: number
  ): ReviewQuestion {
    let question = reviewQuestions.find(q => q.questionId === questionId)

    if (!question) {
      question = {
        questionId,
        level,
        lastAttempt: new Date(),
        attemptCount: 1,
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        nextReviewDate: this.calculateNextReviewDate(0, isCorrect, difficulty),
        difficulty,
        masteryLevel: 'learning'
      }
      reviewQuestions.push(question)
    } else {
      question.attemptCount++
      if (isCorrect) {
        question.correctCount++
      } else {
        question.wrongCount++
      }
      question.lastAttempt = new Date()

      // 間隔反復学習のインデックスを計算
      const intervalIndex = Math.min(
        question.correctCount - 1,
        SPACED_REPETITION_INTERVALS.length - 1
      )
      question.nextReviewDate = this.calculateNextReviewDate(intervalIndex, isCorrect, difficulty)

      // マスタリーレベルの更新
      const accuracy = question.correctCount / question.attemptCount
      if (accuracy >= 0.9 && question.attemptCount >= 5) {
        question.masteryLevel = 'mastered'
      } else if (accuracy >= 0.7 && question.attemptCount >= 3) {
        question.masteryLevel = 'reviewing'
      } else {
        question.masteryLevel = 'learning'
      }
    }

    return question
  }

  /**
   * 次回復習日の計算
   */
  private calculateNextReviewDate(
    intervalIndex: number,
    isCorrect: boolean,
    difficulty: number
  ): Date {
    const now = new Date()
    let daysToAdd: number

    if (!isCorrect) {
      // 間違えた場合は1日後に復習
      daysToAdd = 1
    } else {
      // 正解した場合は間隔を延ばす
      const baseInterval = SPACED_REPETITION_INTERVALS[intervalIndex] || 180
      // 難易度による調整（難しい問題は復習間隔を短く）
      const difficultyMultiplier = 2 - (difficulty / 10)
      daysToAdd = Math.round(baseInterval * difficultyMultiplier)
    }

    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + daysToAdd)
    return nextDate
  }

  /**
   * 復習が必要な問題を取得
   */
  async getReviewQuestions(
    userId: string,
    level?: number,
    limit: number = 20
  ): Promise<ReviewQuestion[]> {
    try {
      const firestore = firebaseService.getFirestore()
      const now = new Date()
      const reviewQuestions: ReviewQuestion[] = []

      // レベル指定がある場合は特定レベル、ない場合は全レベル
      const levels = level ? [level] : Array.from({ length: 20 }, (_, i) => i + 1)

      for (const lvl of levels) {
        const progressId = `${userId}_${lvl}`
        const progressRef = doc(firestore, this.progressCollectionName, progressId)
        const snapshot = await getDoc(progressRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          const questions = data.reviewQuestions || []
          
          // 復習期限が来ている問題を抽出
          const dueQuestions = questions
            .filter((q: any) => {
              const reviewDate = q.nextReviewDate?.toDate() || new Date()
              return reviewDate <= now && q.masteryLevel !== 'mastered'
            })
            .map((q: any) => ({
              ...q,
              lastAttempt: q.lastAttempt?.toDate() || new Date(),
              nextReviewDate: q.nextReviewDate?.toDate() || new Date()
            }))

          reviewQuestions.push(...dueQuestions)
        }
      }

      // 復習日が近い順にソート
      reviewQuestions.sort((a, b) => 
        a.nextReviewDate.getTime() - b.nextReviewDate.getTime()
      )

      return reviewQuestions.slice(0, limit)
    } catch (error) {
      console.error('Failed to get review questions:', error)
      return []
    }
  }

  /**
   * 全レベルの統計を取得
   */
  async getOverallStatistics(userId: string): Promise<{
    totalQuestions: number
    totalCorrect: number
    totalWrong: number
    overallAccuracy: number
    totalMastered: number
    totalStruggling: number
    currentStreak: number
    bestStreak: number
    levelProgress: { [level: number]: number }
  }> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.progressCollectionName),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)

      let totalQuestions = 0
      let totalCorrect = 0
      let totalWrong = 0
      let totalMastered = 0
      let totalStruggling = 0
      let currentStreak = 0
      let bestStreak = 0
      const levelProgress: { [level: number]: number } = {}

      snapshot.forEach(doc => {
        const data = doc.data()
        totalQuestions += data.totalQuestions || 0
        totalCorrect += data.correctAnswers || 0
        totalWrong += data.wrongAnswers || 0
        totalMastered += (data.masteredQuestions || []).length
        totalStruggling += (data.strugglingQuestions || []).length
        
        if (data.streak > currentStreak) {
          currentStreak = data.streak
        }
        if (data.bestStreak > bestStreak) {
          bestStreak = data.bestStreak
        }

        levelProgress[data.level] = data.accuracy || 0
      })

      const overallAccuracy = totalQuestions > 0 
        ? (totalCorrect / totalQuestions) * 100 
        : 0

      return {
        totalQuestions,
        totalCorrect,
        totalWrong,
        overallAccuracy,
        totalMastered,
        totalStruggling,
        currentStreak,
        bestStreak,
        levelProgress
      }
    } catch (error) {
      console.error('Failed to get overall statistics:', error)
      return {
        totalQuestions: 0,
        totalCorrect: 0,
        totalWrong: 0,
        overallAccuracy: 0,
        totalMastered: 0,
        totalStruggling: 0,
        currentStreak: 0,
        bestStreak: 0,
        levelProgress: {}
      }
    }
  }

  /**
   * ストリークのリセット（日付が変わった場合）
   */
  async checkAndResetStreak(userId: string): Promise<void> {
    try {
      const firestore = firebaseService.getFirestore()
      const q = query(
        collection(firestore, this.progressCollectionName),
        where('userId', '==', userId)
      )
      const snapshot = await getDocs(q)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      for (const doc of snapshot.docs) {
        const data = doc.data()
        const lastAttempt = data.lastAttemptDate?.toDate()
        
        if (lastAttempt) {
          const lastAttemptDay = new Date(
            lastAttempt.getFullYear(),
            lastAttempt.getMonth(),
            lastAttempt.getDate()
          )

          // 最後の試行が昨日より前の場合、ストリークをリセット
          const daysDiff = Math.floor((today.getTime() - lastAttemptDay.getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff > 1) {
            await updateDoc(doc.ref, {
              streak: 0,
              updatedAt: serverTimestamp()
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to check and reset streak:', error)
    }
  }
}

export default new LearningProgressService()