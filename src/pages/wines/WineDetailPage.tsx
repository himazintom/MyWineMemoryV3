import { useParams, Link } from 'react-router-dom'

export default function WineDetailPage() {
  const { id } = useParams()
  
  return (
    <div className="wine-detail-page">
      <div className="wine-detail-header">
        <button className="back-btn">← 戻る</button>
        <div className="wine-actions">
          <button className="btn btn-secondary">編集</button>
          <Link to={`/wines/${id}/record`} className="btn btn-primary">
            テイスティング記録
          </Link>
        </div>
      </div>
      
      <div className="wine-detail-content">
        <div className="wine-image-section">
          <div className="wine-image-placeholder">
            🍷
          </div>
        </div>
        
        <div className="wine-info-section">
          <h1>ワイン詳細</h1>
          <div className="wine-details">
            <div className="detail-item">
              <label>ワイン名</label>
              <span>サンプルワイン</span>
            </div>
            <div className="detail-item">
              <label>生産者</label>
              <span>サンプル生産者</span>
            </div>
            <div className="detail-item">
              <label>産地</label>
              <span>フランス・ボルドー</span>
            </div>
            <div className="detail-item">
              <label>ヴィンテージ</label>
              <span>2020</span>
            </div>
          </div>
        </div>
        
        <div className="tasting-records-section">
          <h2>テイスティング記録</h2>
          <div className="records-list">
            <p>まだテイスティング記録がありません。</p>
            <Link to={`/wines/${id}/record`} className="btn btn-primary">
              記録を追加
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}