export default function QuizPage() {
  return (
    <div className="quiz-page">
      <div className="page-header">
        <h1>ワインクイズ</h1>
      </div>
      
      {/* ワンノックイズセクション */}
      <div className="daily-quiz-section">
        <h2>今日のワンノックイズ 🍷</h2>
        <div className="daily-quiz-card">
          <div className="quiz-status">
            <div className="hearts">
              <span>❤️❤️❤️❤️❤️</span>
              <span className="hearts-text">5/5</span>
            </div>
            <div className="today-stats">
              <span>今日: 3/5問正解</span>
            </div>
          </div>
          <div className="daily-quiz-actions">
            <button className="btn btn-primary">1問だけ挑戦</button>
            <button className="btn btn-secondary">続きから</button>
          </div>
        </div>
      </div>
      
      <div className="quiz-levels">
        <h2>レベル別クイズ</h2>
        
        <div className="levels-grid">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i + 1} className="level-card">
              <div className="level-number">Level {i + 1}</div>
              <div className="level-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '0%' }}></div>
                </div>
                <span className="progress-text">0/100</span>
              </div>
              <button className="btn btn-primary">Start</button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-label">ハート</span>
          <span className="stat-value">♥️♥️♥️♥️♥️</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">総正解率</span>
          <span className="stat-value">-%</span>
        </div>
      </div>
    </div>
  )
}