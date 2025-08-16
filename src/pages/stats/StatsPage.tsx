export default function StatsPage() {
  return (
    <div className="stats-page">
      <div className="page-header">
        <h1>統計ダッシュボード</h1>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>総記録数</h3>
          <div className="stat-value">0</div>
        </div>
        
        <div className="stat-card">
          <h3>平均評価</h3>
          <div className="stat-value">-</div>
        </div>
        
        <div className="stat-card">
          <h3>最高評価</h3>
          <div className="stat-value">-</div>
        </div>
        
        <div className="stat-card">
          <h3>ワイン数</h3>
          <div className="stat-value">0</div>
        </div>
      </div>
      
      <div className="charts-section">
        <div className="chart-container">
          <h2>月別記録数</h2>
          <div className="chart-placeholder">
            <p>チャートが表示されます</p>
          </div>
        </div>
        
        <div className="chart-container">
          <h2>国別分布</h2>
          <div className="chart-placeholder">
            <p>円グラフが表示されます</p>
          </div>
        </div>
      </div>
    </div>
  )
}