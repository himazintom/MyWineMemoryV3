import { Link } from 'react-router-dom'

export default function ProfilePage() {
  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>プロフィール</h1>
      </div>
      
      <div className="profile-section">
        <div className="user-info">
          <div className="avatar-placeholder">
            👤
          </div>
          <div className="user-details">
            <h2>ゲストユーザー</h2>
            <p>ゲストモードで利用中</p>
          </div>
        </div>
        
        <div className="auth-prompt">
          <p>アカウントを作成してデータを同期しませんか？</p>
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">
              ログイン
            </Link>
            <Link to="/register" className="btn btn-secondary">
              新規登録
            </Link>
          </div>
        </div>
      </div>
      
      <div className="menu-section">
        <Link to="/settings" className="menu-item">
          <span>⚙️</span>
          <span>設定</span>
          <span>›</span>
        </Link>
        
        <div className="menu-item">
          <span>📄</span>
          <span>データエクスポート</span>
          <span>›</span>
        </div>
        
        <div className="menu-item">
          <span>📝</span>
          <span>フィードバック</span>
          <span>›</span>
        </div>
      </div>
    </div>
  )
}