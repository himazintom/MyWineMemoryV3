export default function SettingsPage() {
  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>設定</h1>
      </div>
      
      <div className="settings-sections">
        <div className="settings-section">
          <h2>外観</h2>
          
          <div className="setting-item">
            <label htmlFor="theme">テーマ</label>
            <select id="theme" name="theme">
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="auto">システムに合わせる</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="language">言語</label>
            <select id="language" name="language">
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>通知</h2>
          
          <div className="setting-item">
            <label htmlFor="pushNotifications">プッシュ通知</label>
            <input type="checkbox" id="pushNotifications" name="pushNotifications" />
          </div>
          
          <div className="setting-item">
            <label htmlFor="emailNotifications">メール通知</label>
            <input type="checkbox" id="emailNotifications" name="emailNotifications" />
          </div>
        </div>
        
        <div className="settings-section">
          <h2>プライバシー</h2>
          
          <div className="setting-item">
            <label htmlFor="publicProfile">パブリックプロフィール</label>
            <input type="checkbox" id="publicProfile" name="publicProfile" />
          </div>
          
          <div className="setting-item">
            <label htmlFor="showPrices">価格情報を表示</label>
            <input type="checkbox" id="showPrices" name="showPrices" defaultChecked />
          </div>
        </div>
      </div>
      
      <div className="settings-actions">
        <button className="btn btn-primary">
          変更を保存
        </button>
      </div>
    </div>
  )
}