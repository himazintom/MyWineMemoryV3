import { collection, doc, setDoc, getDocs, writeBatch, query, where } from 'firebase/firestore'
import { firebaseService } from './firebase'
import type { User, TastingRecord, QuizProgress } from '../types'

export interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
  skippedCount: number
}

export interface InitializationResult {
  usersInitialized: number
  quizDataInitialized: number
  sampleRecordsCreated: number
  errors: string[]
}

class MigrationService {
  // ユーザーデータの初期化
  async initializeUserData(userId: string, userProfile: Partial<User>): Promise<void> {
    try {
      const userDoc = doc(firebaseService.getFirestore(), 'users', userId)
      
      const defaultUserData: User = {
        uid: userId,
        email: userProfile.email || '',
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || '',
        preferences: {
          notifications: {
            push: true,
            email: true,
            streakReminder: true,
            quizReminder: true,
            heartRecovery: true
          },
          language: 'ja',
          theme: 'light',
          privacy: {
            publicProfile: false,
            publicRecords: false,
            showPrices: true
          }
        },
        subscription: {
          plan: 'free',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...userProfile
      }

      await setDoc(userDoc, defaultUserData, { merge: true })

      // クイズ進捗の初期化
      await this.initializeQuizProgress(userId)
      
    } catch (error) {
      console.error('Failed to initialize user data:', error)
      throw error
    }
  }

  // クイズ進捗の初期化
  async initializeQuizProgress(userId: string): Promise<void> {
    try {
      const batch = writeBatch(firebaseService.getFirestore())

      // 各レベルのクイズ進捗を初期化
      for (let level = 1; level <= 20; level++) {
        const progressDoc = doc(firebaseService.getFirestore(), 'quiz_progress', `${userId}_level${level}`)
        
        const initialProgress: QuizProgress = {
          userId,
          level,
          completedQuestions: [],
          totalQuestions: 100,
          correctAnswers: 0,
          bestScore: 0,
          totalTime: 0,
          averageTime: 0,
          streak: 0,
          hearts: 5,
          isUnlocked: level === 1,
          lastPlayedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }

        batch.set(progressDoc, initialProgress)
      }

      await batch.commit()
    } catch (error) {
      console.error('Failed to initialize quiz progress:', error)
      throw error
    }
  }

  // サンプルデータの作成
  async createSampleData(userId: string): Promise<InitializationResult> {
    const result: InitializationResult = {
      usersInitialized: 0,
      quizDataInitialized: 0,
      sampleRecordsCreated: 0,
      errors: []
    }

    try {
      // サンプルワインテイスティング記録
      const sampleRecords: Omit<TastingRecord, 'id'>[] = [
        {
          userId,
          wineName: 'シャブリ',
          producer: 'ドメーヌ・ルイ・ミシェル',
          vintage: 2020,
          type: 'white',
          region: 'ブルゴーニュ',
          country: 'フランス',
          grapes: ['シャルドネ'],
          price: 3500,
          tastingDate: new Date('2024-01-15'),
          mode: 'detailed' as const,
          rating: 8.5,
          notes: 'シャブリらしいミネラル感と酸味のバランスが素晴らしい一本。',
          isPublic: false,
          environment: {
            temperature: 22,
            weather: 'clear',
            glassType: 'white_wine',
            companions: ['friends']
          },
          tags: ['フランス', 'ブルゴーニュ', 'ミネラル', '辛口'],
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15')
        },
        {
          userId,
          wineName: 'ピノ・ノワール',
          producer: 'ドメーヌ・ド・ラ・ロマネ・コンティ',
          vintage: 2018,
          type: 'red',
          region: 'ブルゴーニュ',
          country: 'フランス',
          grapes: ['ピノ・ノワール'],
          price: 85000,
          tastingDate: new Date('2024-02-14'),
          mode: 'detailed' as const,
          rating: 10,
          notes: '一生に一度の体験。ブルゴーニュピノ・ノワールの頂点。',
          isPublic: false,
          environment: {
            temperature: 20,
            weather: 'clear',
            glassType: 'burgundy',
            companions: ['partner']
          },
          tags: ['フランス', 'ブルゴーニュ', 'プレミアム', '特別な日'],
          createdAt: new Date('2024-02-14'),
          updatedAt: new Date('2024-02-14')
        }
      ]

      const batch = writeBatch(firebaseService.getFirestore())
      sampleRecords.forEach((record) => {
        const recordDoc = doc(collection(firebaseService.getFirestore(), 'tasting_records'))
        batch.set(recordDoc, record)
      })

      await batch.commit()
      result.sampleRecordsCreated = sampleRecords.length

    } catch (error) {
      const errorMsg = `Failed to create sample data: ${error}`
      console.error(errorMsg)
      result.errors.push(errorMsg)
    }

    return result
  }

  // データベース整合性チェック
  async checkDataIntegrity(userId: string): Promise<{
    userExists: boolean
    quizProgressExists: boolean
    recordsCount: number
    missingQuizLevels: number[]
  }> {
    try {
      // ユーザー存在確認
      const userSnapshot = await getDocs(query(collection(firebaseService.getFirestore(), 'users'), where('uid', '==', userId)))
      const userExists = !userSnapshot.empty

      // クイズ進捗確認
      const quizProgressQuery = query(
        collection(firebaseService.getFirestore(), 'quiz_progress'),
        where('userId', '==', userId)
      )
      const quizProgressSnapshot = await getDocs(quizProgressQuery)
      const existingLevels = quizProgressSnapshot.docs.map(doc => doc.data().level)
      const missingQuizLevels = []
      
      for (let level = 1; level <= 20; level++) {
        if (!existingLevels.includes(level)) {
          missingQuizLevels.push(level)
        }
      }

      // 記録数確認
      const recordsQuery = query(
        collection(firebaseService.getFirestore(), 'tasting_records'),
        where('userId', '==', userId)
      )
      const recordsSnapshot = await getDocs(recordsQuery)
      const recordsCount = recordsSnapshot.size

      return {
        userExists,
        quizProgressExists: quizProgressSnapshot.size > 0,
        recordsCount,
        missingQuizLevels
      }
    } catch (error) {
      console.error('Failed to check data integrity:', error)
      throw error
    }
  }

  // データ修復
  async repairUserData(userId: string): Promise<{
    repaired: string[]
    errors: string[]
  }> {
    const result = {
      repaired: [],
      errors: []
    }

    try {
      const integrity = await this.checkDataIntegrity(userId)

      // 不足しているクイズレベルを補完
      if (integrity.missingQuizLevels.length > 0) {
        const batch = writeBatch(firebaseService.getFirestore())
        
        integrity.missingQuizLevels.forEach(level => {
          const progressDoc = doc(firebaseService.getFirestore(), 'quiz_progress', `${userId}_level${level}`)
          const initialProgress: QuizProgress = {
            userId,
            level,
            completedQuestions: [],
            totalQuestions: 100,
            correctAnswers: 0,
            bestScore: 0,
            totalTime: 0,
            averageTime: 0,
            streak: 0,
            hearts: 5,
            isUnlocked: level === 1,
            lastPlayedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
          batch.set(progressDoc, initialProgress)
        })

        await batch.commit()
        result.repaired.push(`Missing quiz levels repaired: ${integrity.missingQuizLevels.join(', ')}`)
      }

      // ユーザーデータが不足している場合は基本データを作成
      if (!integrity.userExists) {
        await this.initializeUserData(userId, {})
        result.repaired.push('User data initialized')
      }

    } catch (error) {
      const errorMsg = `Failed to repair user data: ${error}`
      console.error(errorMsg)
      result.errors.push(errorMsg)
    }

    return result
  }

  // 全ユーザーのデータ整合性チェック（管理者用）
  async checkAllUsersIntegrity(): Promise<{
    totalUsers: number
    usersWithIssues: number
    issuesSummary: Record<string, number>
  }> {
    try {
      const usersSnapshot = await getDocs(collection(firebaseService.getFirestore(), 'users'))
      const totalUsers = usersSnapshot.size
      let usersWithIssues = 0
      const issuesSummary: Record<string, number> = {
        missingQuizProgress: 0,
        incompleteQuizProgress: 0,
        noRecords: 0
      }

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id
        const integrity = await this.checkDataIntegrity(userId)

        let hasIssues = false

        if (!integrity.quizProgressExists) {
          issuesSummary.missingQuizProgress++
          hasIssues = true
        } else if (integrity.missingQuizLevels.length > 0) {
          issuesSummary.incompleteQuizProgress++
          hasIssues = true
        }

        if (integrity.recordsCount === 0) {
          issuesSummary.noRecords++
          hasIssues = true
        }

        if (hasIssues) {
          usersWithIssues++
        }
      }

      return {
        totalUsers,
        usersWithIssues,
        issuesSummary
      }
    } catch (error) {
      console.error('Failed to check all users integrity:', error)
      throw error
    }
  }
}

export const migrationService = new MigrationService()