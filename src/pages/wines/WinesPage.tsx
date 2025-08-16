import { Link } from 'react-router-dom'

export default function WinesPage() {
  return (
    <div className="wines-page">
      <div className="page-header">
        <h1>ワインコレクション</h1>
        <Link to="/wines/add" className="btn btn-primary">
          ワインを追加
        </Link>
      </div>
      
      <div className="search-section">
        <input
          type="search"
          placeholder="ワインを検索..."
          className="search-input"
        />
      </div>
      
      <div className="filter-section">
        <button className="filter-btn">産地</button>
        <button className="filter-btn">品種</button>
        <button className="filter-btn">価格帯</button>
        <button className="filter-btn">評価</button>
      </div>
      
      <div className="wines-grid">
        <div className="wine-card">
          <div className="wine-image-placeholder">
            🍷
          </div>
          <div className="wine-info">
            <h3>サンプルワイン</h3>
            <p>フランス・ボルドー</p>
            <div className="wine-rating">★★★★☆</div>
          </div>
        </div>
        
        <div className="empty-state">
          <p>まだワインが登録されていません。</p>
          <Link to="/wines/add" className="btn btn-secondary">
            最初のワインを追加
          </Link>
        </div>
      </div>
    </div>
  )
}