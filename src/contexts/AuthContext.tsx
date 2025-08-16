import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User } from '../types/user'
import firebaseService from '../services/firebase'

interface AuthContextType {
  // 認証状態
  currentUser: FirebaseUser | null
  userProfile: User | null
  loading: boolean
  
  // 認証メソッド
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>
  signOut: () => Promise<void>
  
  // ユーザープロフィール管理
  updateUserProfile: (data: Partial<User>) => Promise<void>
  refreshUserProfile: () => Promise<void>
  
  // ゲストモード
  isGuestMode: boolean
  switchToGuestMode: () => void
  migrateGuestData: () => Promise<void>
  
  // エラーハンドリング
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const GUEST_USER_KEY = 'guest_user_data'
const GUEST_MODE_KEY = 'guest_mode'

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGuestMode, setIsGuestMode] = useState(false)
  
  // エラークリア
  const clearError = () => setError(null)
  
  // ゲストモードの初期化
  useEffect(() => {
    const guestMode = localStorage.getItem(GUEST_MODE_KEY) === 'true'
    setIsGuestMode(guestMode)
    
    if (guestMode) {
      loadGuestUser()
      setLoading(false)
    }
  }, [])
  
  // Firebase認証状態の監視
  useEffect(() => {
    if (isGuestMode) return
    
    const unsubscribe = firebaseService.onAuthStateChanged(async (user) => {
      try {
        setCurrentUser(user)
        
        if (user) {
          // ユーザープロフィールの取得または作成
          await handleUserSignIn(user)
        } else {
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Auth state change error:', err)
        setError(firebaseService.getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })
    
    return unsubscribe
  }, [isGuestMode])
  
  // ゲストユーザーの読み込み
  const loadGuestUser = () => {
    const guestData = localStorage.getItem(GUEST_USER_KEY)
    if (guestData) {
      try {
        const userData = JSON.parse(guestData)
        setUserProfile(userData)
      } catch (err) {
        console.error('Failed to load guest user data:', err)
        localStorage.removeItem(GUEST_USER_KEY)
      }
    } else {
      // デフォルトゲストユーザーの作成
      const defaultGuestUser: User = {
        uid: 'guest',
        email: '',
        displayName: 'ゲストユーザー',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setUserProfile(defaultGuestUser)
      localStorage.setItem(GUEST_USER_KEY, JSON.stringify(defaultGuestUser))
    }
  }
  
  // ユーザーサインイン処理
  const handleUserSignIn = async (firebaseUser: FirebaseUser) => {
    try {
      // 新しいsyncUserProfile機能を使用
      const profile = await firebaseService.syncUserProfile(firebaseUser)
      setUserProfile(profile)
    } catch (err) {
      console.error('Failed to handle user sign in:', err)
      throw err
    }
  }
  
  // Google OAuth サインイン
  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      
      // ゲストモードを無効化
      if (isGuestMode) {
        setIsGuestMode(false)
        localStorage.removeItem(GUEST_MODE_KEY)
      }
      
      await firebaseService.signInWithGoogle()
    } catch (err) {
      console.error('Google sign-in failed:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  // メールアドレスサインイン
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null)
      setLoading(true)
      
      // ゲストモードを無効化
      if (isGuestMode) {
        setIsGuestMode(false)
        localStorage.removeItem(GUEST_MODE_KEY)
      }
      
      await firebaseService.signInWithEmail(email, password)
    } catch (err) {
      console.error('Email sign-in failed:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  // メールアドレスサインアップ
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null)
      setLoading(true)
      
      // ゲストモードを無効化
      if (isGuestMode) {
        setIsGuestMode(false)
        localStorage.removeItem(GUEST_MODE_KEY)
      }
      
      await firebaseService.signUpWithEmail(email, password, displayName)
    } catch (err) {
      console.error('Email sign-up failed:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  // サインアウト
  const signOut = async () => {
    try {
      setError(null)
      
      if (isGuestMode) {
        // ゲストモードの場合はローカルデータをクリア
        setIsGuestMode(false)
        setUserProfile(null)
        localStorage.removeItem(GUEST_MODE_KEY)
        localStorage.removeItem(GUEST_USER_KEY)
      } else {
        // Firebase認証のサインアウト
        await firebaseService.signOut()
      }
    } catch (err) {
      console.error('Sign-out failed:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    }
  }
  
  // ユーザープロフィール更新
  const updateUserProfile = async (data: Partial<User>) => {
    try {
      setError(null)
      
      if (isGuestMode) {
        // ゲストモードの場合はローカルストレージを更新
        if (userProfile) {
          const updatedProfile = { ...userProfile, ...data, updatedAt: new Date() }
          setUserProfile(updatedProfile)
          localStorage.setItem(GUEST_USER_KEY, JSON.stringify(updatedProfile))
        }
      } else if (currentUser && userProfile) {
        // Firebase認証ユーザーの場合
        await firebaseService.updateUserProfile(currentUser.uid, data)
        const updatedProfile = { ...userProfile, ...data, updatedAt: new Date() }
        setUserProfile(updatedProfile)
      }
    } catch (err) {
      console.error('Failed to update user profile:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    }
  }
  
  // ユーザープロフィール再取得
  const refreshUserProfile = async () => {
    try {
      if (currentUser) {
        const profile = await firebaseService.getUserProfile(currentUser.uid)
        setUserProfile(profile)
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    }
  }
  
  // ゲストモードに切り替え
  const switchToGuestMode = () => {
    setIsGuestMode(true)
    setCurrentUser(null)
    localStorage.setItem(GUEST_MODE_KEY, 'true')
    loadGuestUser()
  }
  
  // ゲストデータの移行
  const migrateGuestData = async () => {
    try {
      if (!isGuestMode || !currentUser) {
        throw new Error('Invalid migration state: ゲストモードでないか、認証ユーザーが存在しません')
      }
      
      setError(null)
      
      // 1. ローカルストレージからゲストデータを検出・取得
      const guestDataInfo = firebaseService.detectGuestData()
      
      if (!guestDataInfo.hasData) {
        console.log('No guest data found to migrate')
        // ゲストモードを無効化
        setIsGuestMode(false)
        localStorage.removeItem(GUEST_MODE_KEY)
        localStorage.removeItem(GUEST_USER_KEY)
        return
      }
      
      console.log('Guest data detected:', guestDataInfo.summary)
      
      // 2. Firebase にデータを移行
      const migrationResult = await firebaseService.migrateGuestDataToFirestore(
        currentUser.uid,
        guestDataInfo.data
      )
      
      if (!migrationResult.success) {
        throw new Error(`データ移行に失敗しました: ${migrationResult.errors.join(', ')}`)
      }
      
      console.log('Guest data migration completed:', migrationResult.migratedItems)
      
      // 3. ローカルデータをクリーンアップ
      firebaseService.clearGuestData()
      
      // ゲストモードを無効化
      setIsGuestMode(false)
      
      // ユーザープロフィールを再取得（移行されたデータが反映されるように）
      await refreshUserProfile()
      
    } catch (err) {
      console.error('Failed to migrate guest data:', err)
      setError(firebaseService.getErrorMessage(err))
      throw err
    }
  }
  
  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateUserProfile,
    refreshUserProfile,
    isGuestMode,
    switchToGuestMode,
    migrateGuestData,
    error,
    clearError
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}