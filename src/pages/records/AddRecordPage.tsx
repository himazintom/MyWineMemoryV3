export default function AddRecordPage() {
  return (
    <div className="add-record-page">
      <div className="page-header">
        <h1>テイスティング記録を追加</h1>
      </div>
      
      <form className="record-form">
        <div className="form-section">
          <h2>基本情報</h2>
          
          <div className="form-group">
            <label htmlFor="rating">総合評価 *</label>
            <select id="rating" name="rating" required>
              <option value="">選択してください</option>
              <option value="10">10 - 卓越</option>
              <option value="9">9 - 非常に優秀</option>
              <option value="8">8 - 優秀</option>
              <option value="7">7 - 良い</option>
              <option value="6">6 - 普通</option>
              <option value="5">5 - 下回り</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">メモ</label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="テイスティングノートを入力..."
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary">
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary">
            記録を保存
          </button>
        </div>
      </form>
    </div>
  )
}