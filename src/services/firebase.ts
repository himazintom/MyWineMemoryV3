import { initializeApp } from 'firebase/app'
import { getEnvVar } from '../utils/env'

import type { FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import type {
  Auth, 
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch
} from 'firebase/firestore'
import type {
  Firestore,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore'
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage'
import type { FirebaseStorage } from 'firebase/storage'
import type { User } from '../types/user'

// Firebase 設定オブジェクト
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
}

// 環境変数の検証
function validateEnvironment(): void {
  const requiredVars = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain, 
    firebaseConfig.projectId,
    firebaseConfig.storageBucket,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId
  ]
  
  const requiredVarNames = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ]
  
  const missing = requiredVars
    .map((value, index) => !value ? requiredVarNames[index] : null)
    .filter(Boolean) as string[]
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Firebase サービスクラス（シングルトンパターン）
 * 認証、Firestore、Storage の操作を一元管理
 */
class FirebaseService {
  private static instance: FirebaseService
  private app: FirebaseApp
  private auth: Auth
  private firestore: Firestore
  private storage: FirebaseStorage
  private googleProvider: GoogleAuthProvider
  
  private constructor() {
    validateEnvironment()
    
    // Firebase アプリケーションの初期化
    this.app = initializeApp(firebaseConfig)
    this.auth = getAuth(this.app)
    this.firestore = getFirestore(this.app)
    this.storage = getStorage(this.app)
    
    // 認証の永続性を設定（ブラウザを閉じても認証状態を保持）
    setPersistence(this.auth, browserLocalPersistence).catch(error => {
      console.warn('Failed to set auth persistence:', error)
    })
    
    // Google認証プロバイダーの設定
    this.googleProvider = new GoogleAuthProvider()
    this.googleProvider.addScope('email')
    this.googleProvider.addScope('profile')
  }
  
  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService()
    }
    return FirebaseService.instance
  }
  
  /**
   * Firestoreインスタンスの取得
   */
  public getFirestore(): Firestore {
    return this.firestore
  }
  
  /**
   * Authインスタンスの取得
   */
  public getAuth(): Auth {
    return this.auth
  }
  
  /**
   * Storageインスタンスの取得
   */
  public getStorage(): FirebaseStorage {
    return this.storage
  }
  
  /**
   * Firebaseアプリインスタンスの取得
   */
  public getApp(): FirebaseApp {
    return this.app
  }
  
  /**
   * 現在の認証ユーザーの取得
   */
  public getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser
  }
  
  // ===============================
  // 認証関連メソッド
  // ===============================
  
  /**
   * Google OAuth認証
   */
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider)
      return result
    } catch (error) {
      console.error('Google sign-in failed:', error)
      throw error
    }
  }
  
  /**
   * メールアドレスとパスワードでサインアップ
   */
  async signUpWithEmail(email: string, password: string, displayName?: string): Promise<UserCredential> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password)
      
      // 表示名の更新
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName })
      }
      
      return result
    } catch (error) {
      console.error('Email sign-up failed:', error)
      throw error
    }
  }
  
  /**
   * メールアドレスとパスワードでサインイン
   */
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password)
      return result
    } catch (error) {
      console.error('Email sign-in failed:', error)
      throw error
    }
  }
  
  /**
   * ユーザーのサインアウト
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth)
    } catch (error) {
      console.error('Sign-out failed:', error)
      throw error
    }
  }
  
  /**
   * 認証状態の監視
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback)
  }
  
  
  // ===============================
  // Firestore関連メソッド
  // ===============================
  
  /**
   * ユーザープロフィールの作成
   */
  async createUserProfile(uid: string, userData: Omit<User, 'uid'>): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid)
      await setDoc(userRef, {
        ...userData,
        uid,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to create user profile:', error)
      throw error
    }
  }
  
  /**
   * ユーザープロフィールの取得
   */
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, 'users', uid)
      const userDoc = await getDoc(userRef)
      
      if (userDoc.exists()) {
        return userDoc.data() as User
      }
      return null
    } catch (error) {
      console.error('Failed to get user profile:', error)
      throw error
    }
  }
  
  /**
   * ユーザープロフィールの更新
   */
  async updateUserProfile(uid: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid)
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Failed to update user profile:', error)
      throw error
    }
  }
  
  /**
   * ユーザープロフィールの削除
   */
  async deleteUserProfile(uid: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid)
      await deleteDoc(userRef)
    } catch (error) {
      console.error('Failed to delete user profile:', error)
      throw error
    }
  }
  
  /**
   * ユーザープロフィールの存在確認
   */
  async userProfileExists(uid: string): Promise<boolean> {
    try {
      const userRef = doc(this.firestore, 'users', uid)
      const userDoc = await getDoc(userRef)
      return userDoc.exists()
    } catch (error) {
      console.error('Failed to check user profile existence:', error)
      return false
    }
  }
  
  /**
   * Firebase Auth User から Firestore User Profile を作成または更新
   */
  async syncUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    try {
      const uid = firebaseUser.uid
      let profile = await this.getUserProfile(uid)
      
      if (!profile) {
        // 新規ユーザーの場合、プロフィールを作成
        const newProfile: Omit<User, 'uid'> = {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: {
            theme: 'auto',
            language: 'ja',
            notifications: {
              push: true,
              email: true,
              streakReminder: true,
              quizReminder: true,
              heartRecovery: true
            },
            privacy: {
              publicProfile: false,
              publicRecords: false,
              showPrices: false
            }
          }
        }
        
        await this.createUserProfile(uid, newProfile)
        profile = { ...newProfile, uid }
      } else {
        // 既存ユーザーの場合、Firebase Authの情報で更新
        const updates: Partial<User> = {}
        let needsUpdate = false
        
        if (profile.email !== firebaseUser.email) {
          updates.email = firebaseUser.email || ''
          needsUpdate = true
        }
        
        if (profile.displayName !== firebaseUser.displayName) {
          updates.displayName = firebaseUser.displayName || ''
          needsUpdate = true
        }
        
        if (profile.photoURL !== firebaseUser.photoURL) {
          updates.photoURL = firebaseUser.photoURL || undefined
          needsUpdate = true
        }
        
        if (needsUpdate) {
          await this.updateUserProfile(uid, updates)
          profile = { ...profile, ...updates, updatedAt: new Date() }
        }
      }
      
      return profile
    } catch (error) {
      console.error('Failed to sync user profile:', error)
      throw error
    }
  }
  
  /**
   * コレクションからドキュメントを取得
   */
  async getCollection(collectionName: string, userId?: string): Promise<QuerySnapshot<DocumentData>> {
    try {
      const collectionRef = collection(this.firestore, collectionName)
      
      if (userId) {
        const q = query(collectionRef, where('userId', '==', userId))
        return await getDocs(q)
      }
      
      return await getDocs(collectionRef)
    } catch (error) {
      console.error(`Failed to get collection ${collectionName}:`, error)
      throw error
    }
  }
  
  // ===============================
  // ゲストデータ移行関連メソッド
  // ===============================
  
  /**
   * ローカルストレージからゲストデータを検出・取得
   */
  detectGuestData(): {
    hasData: boolean
    dataTypes: string[]
    summary: string
    data: Record<string, any>
  } {
    const guestDataKeys = [
      'guest_user_data',
      'guest_tasting_records',
      'guest_wine_collection',
      'guest_quiz_progress',
      'guest_user_stats',
      'guest_daily_goals'
    ]
    
    const detectedData: Record<string, any> = {}
    const dataTypes: string[] = []
    
    for (const key of guestDataKeys) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          const parsedData = JSON.parse(data)
          detectedData[key] = parsedData
          dataTypes.push(key.replace('guest_', ''))
        } catch (error) {
          console.warn(`Failed to parse guest data for key: ${key}`, error)
        }
      }
    }
    
    const hasData = dataTypes.length > 0
    const summary = this.generateGuestDataSummary(detectedData)
    
    return {
      hasData,
      dataTypes,
      summary,
      data: detectedData
    }
  }
  
  /**
   * ゲストデータの要約を生成
   */
  private generateGuestDataSummary(data: Record<string, any>): string {
    const summaryParts: string[] = []
    
    // テイスティング記録
    if (data.guest_tasting_records) {
      const records = Array.isArray(data.guest_tasting_records) 
        ? data.guest_tasting_records 
        : Object.values(data.guest_tasting_records)
      summaryParts.push(`テイスティング記録: ${records.length}件`)
    }
    
    // ワインコレクション
    if (data.guest_wine_collection) {
      const wines = Array.isArray(data.guest_wine_collection)
        ? data.guest_wine_collection
        : Object.values(data.guest_wine_collection)
      summaryParts.push(`ワインコレクション: ${wines.length}件`)
    }
    
    // クイズ進捗
    if (data.guest_quiz_progress) {
      const progress = data.guest_quiz_progress
      if (progress.completedQuestions) {
        summaryParts.push(`クイズ進捗: ${progress.completedQuestions.length}問完了`)
      }
    }
    
    // ユーザー統計
    if (data.guest_user_stats) {
      const stats = data.guest_user_stats
      if (stats.totalRecords) {
        summaryParts.push(`総記録数: ${stats.totalRecords}`)
      }
    }
    
    return summaryParts.length > 0 
      ? summaryParts.join(', ')
      : 'データが見つかりませんでした'
  }
  
  /**
   * ゲストデータをFirestoreに移行
   */
  async migrateGuestDataToFirestore(
    userId: string, 
    guestData: Record<string, any>
  ): Promise<{
    success: boolean
    migratedItems: string[]
    errors: string[]
  }> {
    const migratedItems: string[] = []
    const errors: string[] = []
    
    try {
      // バッチ処理用（Firestoreは500件まで）
      const batch = writeBatch(this.firestore)
      let operationCount = 0
      
      // 1. テイスティング記録の移行
      if (guestData.guest_tasting_records) {
        try {
          const records = Array.isArray(guestData.guest_tasting_records)
            ? guestData.guest_tasting_records
            : Object.values(guestData.guest_tasting_records)
          
          for (const record of records) {
            if (operationCount >= 400) break // 安全のため400件でストップ
            
            const recordRef = doc(collection(this.firestore, 'tastingRecords'))
            batch.set(recordRef, {
              ...record,
              userId,
              id: recordRef.id,
              migratedAt: new Date(),
              originalGuestId: record.id || 'unknown'
            })
            operationCount++
          }
          
          migratedItems.push(`テイスティング記録: ${records.length}件`)
        } catch (error) {
          errors.push(`テイスティング記録の移行エラー: ${error}`)
        }
      }
      
      // 2. ワインコレクションの移行
      if (guestData.guest_wine_collection) {
        try {
          const wines = Array.isArray(guestData.guest_wine_collection)
            ? guestData.guest_wine_collection
            : Object.values(guestData.guest_wine_collection)
          
          for (const wine of wines) {
            if (operationCount >= 400) break
            
            const wineRef = doc(collection(this.firestore, 'wines'))
            batch.set(wineRef, {
              ...wine,
              userId,
              id: wineRef.id,
              migratedAt: new Date(),
              originalGuestId: wine.id || 'unknown'
            })
            operationCount++
          }
          
          migratedItems.push(`ワインコレクション: ${wines.length}件`)
        } catch (error) {
          errors.push(`ワインコレクションの移行エラー: ${error}`)
        }
      }
      
      // 3. クイズ進捗の移行
      if (guestData.guest_quiz_progress) {
        try {
          const progressRef = doc(this.firestore, 'quizProgress', userId)
          batch.set(progressRef, {
            ...guestData.guest_quiz_progress,
            userId,
            migratedAt: new Date()
          })
          operationCount++
          
          migratedItems.push('クイズ進捗')
        } catch (error) {
          errors.push(`クイズ進捗の移行エラー: ${error}`)
        }
      }
      
      // 4. ユーザー統計の移行
      if (guestData.guest_user_stats) {
        try {
          const statsRef = doc(this.firestore, 'userStats', userId)
          batch.set(statsRef, {
            ...guestData.guest_user_stats,
            userId,
            migratedAt: new Date()
          })
          operationCount++
          
          migratedItems.push('ユーザー統計')
        } catch (error) {
          errors.push(`ユーザー統計の移行エラー: ${error}`)
        }
      }
      
      // バッチ実行
      if (operationCount > 0) {
        await batch.commit()
      }
      
      return {
        success: errors.length === 0,
        migratedItems,
        errors
      }
      
    } catch (error) {
      console.error('Guest data migration failed:', error)
      return {
        success: false,
        migratedItems,
        errors: [`移行処理エラー: ${error}`]
      }
    }
  }
  
  /**
   * ローカルストレージからゲストデータを削除
   */
  clearGuestData(): void {
    const guestDataKeys = [
      'guest_user_data',
      'guest_tasting_records', 
      'guest_wine_collection',
      'guest_quiz_progress',
      'guest_user_stats',
      'guest_daily_goals',
      'guest_mode'
    ]
    
    for (const key of guestDataKeys) {
      localStorage.removeItem(key)
    }
  }
  
  // ===============================
  // Storage関連メソッド
  // ===============================
  
  /**
   * ファイルのアップロード
   */
  async uploadFile(path: string, file: File): Promise<string> {
    try {
      const storageRef = ref(this.storage, path)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      return downloadURL
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  }
  
  /**
   * ファイルの削除
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, path)
      await deleteObject(storageRef)
    } catch (error) {
      console.error('File deletion failed:', error)
      throw error
    }
  }
  
  // ===============================
  // ユーティリティメソッド
  // ===============================
  
  /**
   * Firebase エラーメッセージの日本語化
   */
  getErrorMessage(error: any): string {
    const errorCode = error?.code || 'unknown'
    
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'ユーザーが見つかりません',
      'auth/wrong-password': 'パスワードが間違っています',
      'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
      'auth/weak-password': 'パスワードが弱すぎます（6文字以上で入力してください）',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/network-request-failed': 'ネットワークエラーが発生しました',
      'auth/too-many-requests': 'リクエスト回数が上限を超えました。しばらくお待ちください',
      'auth/popup-closed-by-user': 'ポップアップがユーザーによって閉じられました',
      'permission-denied': 'アクセス権限がありません',
      'unavailable': 'サービスが一時的に利用できません'
    }
    
    return errorMessages[errorCode] || 'エラーが発生しました。しばらくしてからもう一度お試しください。'
  }
}

// シングルトンインスタンスをエクスポート
export const firebaseService = FirebaseService.getInstance()
export default firebaseService