import { useState } from 'react'
import PrivacySettings from './PrivacySettings'
import DataExportDialog from './DataExportDialog'
import DataDeletionDialog from './DataDeletionDialog'
import Button from '../common/Button'

interface PrivacyDashboardProps {
  className?: string
}

export default function PrivacyDashboard({ className = '' }: PrivacyDashboardProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'data' | 'gdpr'>('settings')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showDeletionDialog, setShowDeletionDialog] = useState(false)

  const handleDataDeleted = () => {
    setShowDeletionDialog(false)
    // ここでログアウトやリダイレクトなどの処理を行う
    console.log('User data deleted, redirecting...')
  }

  return (
    <div className={`privacy-dashboard ${className}`}>
      <div className="dashboard-header">
        <h1>プライバシー管理</h1>
        <p>あなたのデータとプライバシーを完全にコントロールできます</p>
      </div>

      {/* タブナビゲーション */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          プライバシー設定
        </button>
        <button
          className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          データ管理
        </button>
        <button
          className={`tab-button ${activeTab === 'gdpr' ? 'active' : ''}`}
          onClick={() => setActiveTab('gdpr')}
        >
          GDPR権利
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {activeTab === 'settings' && (
          <PrivacySettings />
        )}

        {activeTab === 'data' && (
          <DataManagementTab 
            onExport={() => setShowExportDialog(true)}
            onDelete={() => setShowDeletionDialog(true)}
          />
        )}

        {activeTab === 'gdpr' && (
          <GDPRRightsTab 
            onExport={() => setShowExportDialog(true)}
            onDelete={() => setShowDeletionDialog(true)}
          />
        )}
      </div>

      {/* ダイアログ */}
      <DataExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      <DataDeletionDialog
        isOpen={showDeletionDialog}
        onClose={() => setShowDeletionDialog(false)}
        onDeleted={handleDataDeleted}
      />

      <style jsx>{`
        .privacy-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .dashboard-header h1 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 2rem;
          font-weight: 600;
        }

        .dashboard-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1.125rem;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .tab-navigation {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 3rem;
          border-bottom: 1px solid var(--border);
        }

        .tab-button {
          padding: 1rem 2rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .tab-button:hover {
          color: var(--text-primary);
        }

        .tab-button.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .tab-content {
          min-height: 500px;
        }

        @media (max-width: 768px) {
          .privacy-dashboard {
            padding: 1rem;
          }

          .dashboard-header h1 {
            font-size: 1.5rem;
          }

          .dashboard-header p {
            font-size: 1rem;
          }

          .tab-navigation {
            overflow-x: auto;
            justify-content: flex-start;
            padding-bottom: 0.5rem;
          }

          .tab-button {
            white-space: nowrap;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  )
}

// データ管理タブコンポーネント
function DataManagementTab({ 
  onExport, 
  onDelete 
}: { 
  onExport: () => void
  onDelete: () => void 
}) {
  return (
    <div className="data-management-tab">
      <div className="tab-header">
        <h2>データ管理</h2>
        <p>あなたのデータのエクスポートや削除を行うことができます</p>
      </div>

      <div className="action-cards">
        <div className="action-card export-card">
          <div className="card-icon">📥</div>
          <div className="card-content">
            <h3>データエクスポート</h3>
            <p>
              あなたのすべてのデータを標準形式でダウンロードできます。
              JSON形式では完全なデータが、CSV形式では表計算ソフトで使えるデータが取得できます。
            </p>
            <ul className="feature-list">
              <li>テイスティング記録</li>
              <li>プロフィール情報</li>
              <li>設定・環境設定</li>
              <li>統計データ</li>
            </ul>
          </div>
          <div className="card-actions">
            <Button onClick={onExport} variant="primary">
              データをエクスポート
            </Button>
          </div>
        </div>

        <div className="action-card deletion-card">
          <div className="card-icon">🗑️</div>
          <div className="card-content">
            <h3>データ削除</h3>
            <p>
              不要になったデータを削除できます。
              削除されたデータは復旧できませんので、必要に応じて事前にエクスポートしてください。
            </p>
            <ul className="feature-list">
              <li>選択的なデータ削除</li>
              <li>完全削除または匿名化</li>
              <li>削除の確認プロセス</li>
              <li>取り消し不可能</li>
            </ul>
          </div>
          <div className="card-actions">
            <Button onClick={onDelete} variant="danger">
              データを削除
            </Button>
          </div>
        </div>
      </div>

      <div className="data-info">
        <div className="info-section">
          <h3>📊 データの利用について</h3>
          <div className="info-content">
            <p>
              MyWineMemoryでは、あなたのプライバシーを最優先に考えています。
              収集されたデータは以下の目的でのみ使用されます：
            </p>
            <ul>
              <li>アプリの基本機能の提供</li>
              <li>パーソナライズされた体験の提供</li>
              <li>サービスの改善と新機能の開発</li>
              <li>セキュリティとサポートの提供</li>
            </ul>
            <p>
              データの第三者提供は行わず、法的要請がある場合を除き、
              あなたの同意なしにデータを共有することはありません。
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .data-management-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .tab-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .tab-header h2 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .tab-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.6;
        }

        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .action-card {
          background: var(--surface);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .export-card {
          border-left: 4px solid var(--primary);
        }

        .deletion-card {
          border-left: 4px solid var(--error);
        }

        .card-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .card-content h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .card-content p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .feature-list {
          margin: 0 0 1.5rem 0;
          padding-left: 1.25rem;
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .feature-list li {
          margin-bottom: 0.5rem;
        }

        .card-actions {
          margin-top: 1.5rem;
        }

        .data-info {
          background: var(--background);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border);
        }

        .info-section h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.125rem;
        }

        .info-content p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .info-content ul {
          margin: 0 0 1rem 0;
          padding-left: 1.25rem;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .info-content li {
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .action-cards {
            grid-template-columns: 1fr;
          }

          .action-card {
            padding: 1.5rem;
          }

          .data-info {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}

// GDPR権利タブコンポーネント
function GDPRRightsTab({ 
  onExport, 
  onDelete 
}: { 
  onExport: () => void
  onDelete: () => void 
}) {
  return (
    <div className="gdpr-rights-tab">
      <div className="tab-header">
        <h2>GDPR権利について</h2>
        <p>
          EU一般データ保護規則（GDPR）に基づき、あなたには以下の権利があります。
          MyWineMemoryはこれらの権利を完全にサポートします。
        </p>
      </div>

      <div className="rights-sections">
        <div className="rights-section">
          <h3>📋 アクセス権（Right of Access）</h3>
          <p>
            あなたの個人データがどのように処理されているかを知る権利です。
            データエクスポート機能を使用して、保存されているすべてのデータを確認できます。
          </p>
          <Button onClick={onExport} variant="primary" size="sm">
            データを確認
          </Button>
        </div>

        <div className="rights-section">
          <h3>✏️ 訂正権（Right of Rectification）</h3>
          <p>
            不正確または不完全な個人データの訂正を求める権利です。
            プロフィール設定やテイスティング記録の編集機能で、いつでもデータを修正できます。
          </p>
        </div>

        <div className="rights-section">
          <h3>🗑️ 削除権・忘れられる権利（Right to Erasure）</h3>
          <p>
            個人データの削除を求める権利です。
            不要になったデータを部分的または完全に削除できます。
          </p>
          <Button onClick={onDelete} variant="danger" size="sm">
            データ削除
          </Button>
        </div>

        <div className="rights-section">
          <h3>🚫 処理制限権（Right to Restrict Processing）</h3>
          <p>
            データの処理を制限する権利です。
            プライバシー設定で、データの共有や公開を制限できます。
          </p>
        </div>

        <div className="rights-section">
          <h3>📤 データポータビリティ権（Right to Data Portability）</h3>
          <p>
            データを構造化された一般的な形式で受け取る権利です。
            JSONやCSV形式でデータをエクスポートし、他のサービスに移行できます。
          </p>
          <Button onClick={onExport} variant="secondary" size="sm">
            データ移行用エクスポート
          </Button>
        </div>

        <div className="rights-section">
          <h3>✋ 異議申立権（Right to Object）</h3>
          <p>
            データ処理に異議を申し立てる権利です。
            マーケティング目的での利用や自動化された意思決定に対して異議を申し立てることができます。
          </p>
        </div>
      </div>

      <div className="contact-info">
        <h3>📞 お問い合わせ</h3>
        <p>
          GDPR権利の行使やプライバシーに関するご質問がございましたら、
          以下の方法でお問い合わせください：
        </p>
        <div className="contact-methods">
          <div className="contact-method">
            <strong>メール:</strong> privacy@mywine-memory.com
          </div>
          <div className="contact-method">
            <strong>対応時間:</strong> 平日 9:00-18:00 (JST)
          </div>
          <div className="contact-method">
            <strong>回答期限:</strong> ご連絡から30日以内
          </div>
        </div>
      </div>

      <style jsx>{`
        .gdpr-rights-tab {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .tab-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .tab-header h2 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.5rem;
        }

        .tab-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
        }

        .rights-sections {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .rights-section {
          background: var(--surface);
          border-radius: 0.75rem;
          padding: 1.5rem;
          border: 1px solid var(--border);
        }

        .rights-section h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.125rem;
        }

        .rights-section p {
          margin: 0 0 1rem 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .contact-info {
          background: var(--background);
          border-radius: 1rem;
          padding: 2rem;
          border: 1px solid var(--border);
        }

        .contact-info h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.25rem;
        }

        .contact-info > p {
          margin: 0 0 1.5rem 0;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .contact-methods {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .contact-method {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .contact-method strong {
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .rights-section {
            padding: 1rem;
          }

          .contact-info {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}