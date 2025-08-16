import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import firebaseService from '../../services/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [guestDataInfo, setGuestDataInfo] = useState<{
    hasData: boolean
    summary: string
  } | null>(null)
  
  const { 
    signInWithEmail, 
    signInWithGoogle, 
    switchToGuestMode, 
    migrateGuestData, 
    isGuestMode,
    error, 
    clearError 
  } = useAuth()
  const navigate = useNavigate()

  // ゲストデータの検出
  useEffect(() => {
    const detectedData = firebaseService.detectGuestData()
    setGuestDataInfo({
      hasData: detectedData.hasData,
      summary: detectedData.summary
    })
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    try {
      setIsLoading(true)
      clearError()
      await signInWithEmail(email, password)
      
      // ゲストデータがある場合は移行を実行
      if (guestDataInfo?.hasData) {
        await handleGuestDataMigration()
      }
      
      navigate('/')
    } catch (err) {
      // エラーはAuthContextで管理
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      clearError()
      await signInWithGoogle()
      
      // ゲストデータがある場合は移行を実行
      if (guestDataInfo?.hasData) {
        await handleGuestDataMigration()
      }
      
      navigate('/')
    } catch (err) {
      // エラーはAuthContextで管理
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestDataMigration = async () => {
    try {
      setIsMigrating(true)
      await migrateGuestData()
      console.log('Guest data migration completed successfully')
    } catch (err) {
      console.error('Guest data migration failed:', err)
      // エラーは既にAuthContextで管理されている
    } finally {
      setIsMigrating(false)
    }
  }

  const handleGuestMode = () => {
    switchToGuestMode()
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="auth-container">
        <h2>ログイン</h2>
        
        {error && (
          <ErrorMessage 
            message={error} 
            variant="inline"
            onDismiss={clearError}
          />
        )}
        
        {guestDataInfo?.hasData && (
          <div className="guest-data-notice">
            <div className="notice-icon">📦</div>
            <div className="notice-content">
              <h3>ゲストデータが見つかりました</h3>
              <p>{guestDataInfo.summary}</p>
              <p className="notice-small">
                ログインすると、これらのデータが自動的にアカウントに移行されます。
              </p>
            </div>
          </div>
        )}
        
        {isMigrating && (
          <div className="migration-progress">
            <div className="progress-icon">⏳</div>
            <p>ゲストデータを移行中...</p>
          </div>
        )}
        
        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="パスワードを入力"
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            variant="primary"
            isFullWidth
            isLoading={isLoading}
            disabled={!email || !password}
          >
            ログイン
          </Button>
        </form>
        
        <div className="auth-divider">または</div>
        
        <Button
          variant="google"
          isFullWidth
          isLoading={isLoading}
          onClick={handleGoogleSignIn}
        >
          Googleでログイン
        </Button>
        
        <div className="auth-links">
          <p>
            アカウントをお持ちでない方は{' '}
            <Link to="/register">新規登録</Link>
          </p>
        </div>
        
        <div className="guest-mode">
          <Button
            variant="text"
            onClick={handleGuestMode}
            disabled={isLoading}
          >
            ゲストモードで続行
          </Button>
        </div>
      </div>
    </div>
  )
}