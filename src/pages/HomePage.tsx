import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>My Wine Memory</h1>
        <p>あなたのワインコレクションを記録・管理しましょう</p>
        <div className="cta-buttons">
          <Link to="/wines" className="btn btn-primary">
            ワインを見る
          </Link>
          <Link to="/wines/add" className="btn btn-secondary">
            ワインを追加
          </Link>
        </div>
      </div>
      
      {/* ワンノックイズセクション */}
      <div className="daily-quiz-widget">
        <h2>今日のワンノックイズ 🍷</h2>
        <div className="quiz-widget-content">
          <div className="quiz-info">
            <div className="hearts-display">❤️❤️❤️❤️❤️</div>
            <div className="streak-info">🔥 3日連続</div>
          </div>
          <div className="quiz-actions">
            <Link to="/quiz/daily" className="btn btn-primary">
              1問挑戦
            </Link>
            <span className="quiz-stats">今日: 3/5問正解</span>
          </div>
        </div>
      </div>
      
      <div className="features-section">
        <div className="feature">
          <h3>📝 記録管理</h3>
          <p>ワインの詳細情報とテイスティングノートを記録</p>
        </div>
        <div className="feature">
          <h3>📊 統計表示</h3>
          <p>コレクションの統計をグラフで可視化</p>
        </div>
        <div className="feature">
          <h3>🔍 検索・フィルタ</h3>
          <p>産地、品種、価格帯で簡単検索</p>
        </div>
      </div>
    </div>
  )
}