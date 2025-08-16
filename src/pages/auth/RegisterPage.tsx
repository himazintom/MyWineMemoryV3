import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <div className="register-page">
      <div className="auth-container">
        <h2>新規登録</h2>
        
        <form className="auth-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="your@email.com"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              placeholder="8文字以上のパスワード"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード確認</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              placeholder="パスワードを再入力"
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            新規登録
          </button>
        </form>
        
        <div className="auth-divider">または</div>
        
        <button className="btn btn-google">
          Googleで登録
        </button>
        
        <div className="auth-links">
          <p>
            既にアカウントをお持ちの方は{' '}
            <Link to="/login">ログイン</Link>
          </p>
        </div>
      </div>
    </div>
  )
}