export default function AddWinePage() {
  return (
    <div className="add-wine-page">
      <div className="page-header">
        <h1>ワインを追加</h1>
      </div>
      
      <form className="wine-form">
        <div className="form-section">
          <h2>基本情報</h2>
          
          <div className="form-group">
            <label htmlFor="wineName">ワイン名 *</label>
            <input
              type="text"
              id="wineName"
              name="wineName"
              required
              placeholder="ワイン名を入力"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="producer">生産者 *</label>
            <input
              type="text"
              id="producer"
              name="producer"
              required
              placeholder="生産者名を入力"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="country">国 *</label>
              <select id="country" name="country" required>
                <option value="">選択してください</option>
                <option value="france">フランス</option>
                <option value="italy">イタリア</option>
                <option value="spain">スペイン</option>
                <option value="germany">ドイツ</option>
                <option value="usa">アメリカ</option>
                <option value="chile">チリ</option>
                <option value="australia">オーストラリア</option>
                <option value="japan">日本</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="region">地域</label>
              <input
                type="text"
                id="region"
                name="region"
                placeholder="産地を入力"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vintage">ヴィンテージ</label>
              <input
                type="number"
                id="vintage"
                name="vintage"
                min="1900"
                max="2024"
                placeholder="例: 2020"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="wineType">タイプ *</label>
              <select id="wineType" name="wineType" required>
                <option value="">選択してください</option>
                <option value="red">赤ワイン</option>
                <option value="white">白ワイン</option>
                <option value="rose">ロゼワイン</option>
                <option value="sparkling">スパークリングワイン</option>
                <option value="fortified">酒精強化ワイン</option>
                <option value="dessert">デザートワイン</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <h2>追加情報</h2>
          
          <div className="form-group">
            <label htmlFor="grapeVarieties">ブドウ品種</label>
            <input
              type="text"
              id="grapeVarieties"
              name="grapeVarieties"
              placeholder="カベルネ・ソーヴィニヨン, メルロ..."
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="alcoholContent">アルコール度数 (%)</label>
              <input
                type="number"
                id="alcoholContent"
                name="alcoholContent"
                min="0"
                max="50"
                step="0.1"
                placeholder="例: 13.5"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="price">価格 (円)</label>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                placeholder="例: 3000"
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary">
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary">
            ワインを追加
          </button>
        </div>
      </form>
    </div>
  )
}