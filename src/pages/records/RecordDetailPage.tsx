import { useParams } from 'react-router-dom'

export default function RecordDetailPage() {
  const { id } = useParams()
  
  return (
    <div className="record-detail-page">
      <div className="record-header">
        <button className="back-btn">← 戻る</button>
        <div className="record-actions">
          <button className="btn btn-secondary">編集</button>
          <button className="btn btn-danger">削除</button>
        </div>
      </div>
      
      <div className="record-content">
        <h1>テイスティング記録</h1>
        <div className="record-details">
          <p>記録ID: {id}</p>
          <p>記録の詳細が表示されます。</p>
        </div>
      </div>
    </div>
  )
}