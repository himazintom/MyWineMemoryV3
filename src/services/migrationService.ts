import { collection, doc, setDoc, getDocs, writeBatch, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { QuizData } from '../data/quizData'
import { User, TastingRecord, QuizProgress } from '../types'

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
      const userDoc = doc(db, 'users', userId)
      
      const defaultUserData: User = {
        id: userId,
        email: userProfile.email || '',
        displayName: userProfile.displayName || '',
        photoURL: userProfile.photoURL || '',
        preferences: {
          notifications: true,
          language: 'ja',
          theme: 'light',
          privacy: {
            shareProfile: false,
            shareRecords: false,
            allowAnalytics: true
          }
        },
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          features: ['basic_records', 'basic_quiz']
        },
        gamification: {
          level: 1,
          totalXP: 0,
          hearts: 5,
          maxHearts: 5,
          lastHeartRefill: new Date(),
          achievements: [],
          badges: []
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isAdmin: false,
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
      const batch = writeBatch(db)

      // 各レベルのクイズ進捗を初期化
      for (let level = 1; level <= 20; level++) {
        const progressDoc = doc(db, 'quiz_progress', `${userId}_level${level}`)
        
        const initialProgress: QuizProgress = {
          userId,
          level,
          questionsAnswered: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          averageTime: 0,
          isCompleted: false,
          lastAttemptDate: null,
          attempts: 0,
          bestScore: 0,
          totalTime: 0
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
          wineType: 'white',
          region: 'ブルゴーニュ',
          country: 'フランス',
          grapes: ['シャルドネ'],
          price: 3500,
          purchaseLocation: 'ワインショップ',
          tastingDate: new Date('2024-01-15'),
          appearance: {
            color: 'pale_yellow',
            clarity: 'clear',
            intensity: 'medium'
          },
          aroma: {
            intensity: 'medium',
            characteristics: ['citrus', 'mineral', 'fresh'],
            notes: 'レモンやライムの柑橘系アロマと、シャブリ特有のミネラル感'
          },
          taste: {
            sweetness: 'dry',
            acidity: 'high',
            tannin: 'none',
            body: 'medium',
            alcohol: 'medium',
            balance: 'excellent',
            characteristics: ['crisp', 'mineral', 'elegant'],
            notes: 'キリッとした酸味とミネラル感が心地よい。フィニッシュは長く、エレガント。'
          },
          finish: {
            length: 'long',
            intensity: 'medium',
            notes: 'ミネラルと柑橘の余韻が長く続く'
          },
          overall: {
            rating: 8.5,
            notes: 'シャブリらしいミネラル感と酸味のバランスが素晴らしい一本。',
            drinkingWindow: '今飲み頃',
            foodPairing: ['牡蠣', '白身魚', 'チーズ']
          },
          environment: {
            temperature: 22,
            humidity: 60,
            glassType: 'white_wine',
            company: 'friends'
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
          wineType: 'red',
          region: 'ブルゴーニュ',
          country: 'フランス',
          grapes: ['ピノ・ノワール'],
          price: 85000,
          purchaseLocation: '高級ワインショップ',
          tastingDate: new Date('2024-02-14'),
          appearance: {
            color: 'ruby',
            clarity: 'clear',
            intensity: 'deep'
          },
          aroma: {
            intensity: 'high',
            characteristics: ['red_berry', 'spice', 'earth', 'floral'],
            notes: 'ラズベリーやチェリーの赤果実に、薔薇の花びら、スパイス、土のニュアンス'
          },
          taste: {
            sweetness: 'dry',
            acidity: 'high',
            tannin: 'medium',
            body: 'full',
            alcohol: 'medium_plus',
            balance: 'excellent',
            characteristics: ['complex', 'elegant', 'silky'],
            notes: '非常に複雑で多層的。絹のような滑らかなタンニンと美しい酸味。'
          },
          finish: {
            length: 'very_long',
            intensity: 'high',
            notes: '信じられないほど長く続く余韻。何層にも重なる風味が展開される。'
          },
          overall: {
            rating: 10,
            notes: '一生に一度の体験。ブルゴーニュピノ・ノワールの頂点。',
            drinkingWindow: '今飲み頃〜2030年',
            foodPairing: ['鴨胸肉', 'ジビエ', '熟成チーズ']
          },
          environment: {
            temperature: 20,
            humidity: 55,
            glassType: 'burgundy',
            company: 'partner'
          },
          tags: ['フランス', 'ブルゴーニュ', 'プレミアム', '特別な日'],
          createdAt: new Date('2024-02-14'),
          updatedAt: new Date('2024-02-14')
        }
      ]

      const batch = writeBatch(db)
      sampleRecords.forEach((record, index) => {
        const recordDoc = doc(collection(db, 'tasting_records'))
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
      const userDoc = doc(db, 'users', userId)
      const userSnapshot = await getDocs(query(collection(db, 'users'), where('id', '==', userId)))
      const userExists = !userSnapshot.empty

      // クイズ進捗確認
      const quizProgressQuery = query(
        collection(db, 'quiz_progress'),
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
        collection(db, 'tasting_records'),
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
        const batch = writeBatch(db)
        
        integrity.missingQuizLevels.forEach(level => {
          const progressDoc = doc(db, 'quiz_progress', `${userId}_level${level}`)
          const initialProgress: QuizProgress = {
            userId,
            level,
            questionsAnswered: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            accuracy: 0,
            averageTime: 0,
            isCompleted: false,
            lastAttemptDate: null,
            attempts: 0,
            bestScore: 0,
            totalTime: 0
          }
          batch.set(progressDoc, initialProgress)
        })

        await batch.commit()
        result.repaired.push(`Missing quiz levels repaired: ${integrity.missingQuizLevels.join(', ')}`)
      }

      // ユーザーデータが不足している場合は基本データを作成
      if (!integrity.userExists) {
        await this.initializeUserData(userId, { id: userId })
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
      const usersSnapshot = await getDocs(collection(db, 'users'))
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