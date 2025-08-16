export default function RecordsPage() {
  return (
    <div className="records-page">
      <div className="page-header">
        <h1>テイスティング記録</h1>
      </div>
      
      <div className="records-filters">
        <input type="search" placeholder="記録を検索..." className="search-input" />
        <select className="filter-select">
          <option value="">全ての記録</option>
          <option value="recent">最近の記録</option>
          <option value="high-rated">高評価</option>
        </select>
      </div>
      
      <div className="records-list">
        <div className="empty-state">
          <p>まだテイスティング記録がありません。</p>
          <button className="btn btn-primary">記録を追加</button>
        </div>
      </div>
    </div>
  )
}