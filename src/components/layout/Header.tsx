import { Link } from 'react-router-dom'

export default function Header() {
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
          <Link to="/profile" className="profile-link">
            プロフィール
          </Link>
        </div>
      </div>
    </header>
  )
}