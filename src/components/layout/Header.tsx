import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Header() {
  const navigate = useNavigate()
  const { userProfile, signOut, isGuestMode } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/" className="logo">
          <h1>My Wine Memory</h1>
        </Link>
        
        <nav className="header-nav">
          <Link to="/wines" className="nav-link">
            ワイン
          </Link>
          <Link to="/records" className="nav-link">
            記録
          </Link>
          <Link to="/stats" className="nav-link">
            統計
          </Link>
          <Link to="/quiz" className="nav-link">
            クイズ
          </Link>
        </nav>
        
        <div className="header-actions">
          {userProfile ? (
            <>
              <Link to="/profile" className="profile-link">
                {isGuestMode ? 'ゲスト' : (userProfile.displayName || 'プロフィール')}
              </Link>
              <button onClick={handleSignOut} className="logout-btn">
                ログアウト
              </button>
            </>
          ) : (
            <Link to="/login" className="profile-link">
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}