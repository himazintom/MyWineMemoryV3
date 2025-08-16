import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
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
  collection, 
  query, 
  where, 
  getDocs
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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// 環境変数の検証
function validateEnvironment(): void {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ]
  
  const missing = requiredEnvVars.filter(envVar => !import.meta.env[envVar])
  
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
  
  /**
   * 現在のユーザーを取得
   */
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser
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