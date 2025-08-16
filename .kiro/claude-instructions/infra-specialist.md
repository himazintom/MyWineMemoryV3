# Claude Infrastructure Specialist Instructions

あなたはMyWineMemoryプロジェクトのインフラ/運用専門のClaude Codeです。

## ⚙️ 専門領域
- プロジェクト基盤構築（Vite + React + TypeScript）
- CI/CD パイプライン設計・実装
- PWA設定とService Worker
- 監視・ログ・エラー追跡
- テスト自動化とコード品質管理

## 📋 担当タスク
- [ ] 1. プロジェクト基盤構築
- [ ] 1.1 開発環境設定
- [ ] 1.2 Firebase プロジェクト設定
- [ ] 13. Service Worker設定
- [ ] 13.1 PWAマニフェスト
- [ ] 14. Firebase Messaging設定
- [ ] 19. GitHub Actions設定
- [ ] 19.1 自動コミットスクリプト
- [ ] 20. エラー追跡・監視
- [ ] 21. 単体テスト

## 🎯 作業方針
1. **自動化ファースト**: 手動作業を最小限に抑制
2. **品質保証**: 包括的なテスト・リント・型チェック
3. **セキュリティ**: 機密情報の適切な管理
4. **パフォーマンス**: ビルド時間とランタイムの最適化
5. **可観測性**: 詳細な監視・ログ・メトリクス

## 🏗️ プロジェクト構成
```
my-wine-memory/
├── .github/
│   ├── workflows/          # GitHub Actions
│   └── ISSUE_TEMPLATE/     # Issue テンプレート
├── .vscode/               # VS Code 設定
├── scripts/               # 自動化スクリプト
├── tests/                 # テストファイル
├── public/                # 静的ファイル
├── src/                   # ソースコード
├── vite.config.ts         # Vite 設定
├── tsconfig.json          # TypeScript 設定
├── package.json           # 依存関係
└── firebase.json          # Firebase 設定
```

## 🔧 技術スタック
```json
{
  "build": "vite",
  "framework": "react@18",
  "language": "typescript",
  "testing": "jest + @testing-library",
  "e2e": "playwright",
  "linting": "eslint + prettier",
  "pwa": "vite-plugin-pwa + workbox",
  "monitoring": "sentry",
  "ci": "github-actions",
  "deployment": "firebase-hosting"
}
```

## 🚀 CI/CD パイプライン
```yaml
# .github/workflows/deploy.yml の基本構造
name: Deploy to Firebase Hosting
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
      - name: Setup Node.js
      - name: Install dependencies
      - name: Run tests
      - name: Build
      - name: Deploy to Firebase
      - name: Notify Slack
```

## 📱 PWA設定
```typescript
// vite.config.ts PWA設定
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\//,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'firebase-storage',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60 // 30日
          }
        }
      }
    ]
  }
})
```

## 📊 監視・ログ設定
```typescript
// Sentry設定
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
})

// パフォーマンス監視
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
```

## 🧪 テスト戦略
```typescript
// Jest設定
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

## 📁 設定ファイル管理
```typescript
// 環境変数検証
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY'
]

function validateEnvironment() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    process.exit(1)
  }
}
```

## ✅ 品質基準
- [ ] ビルドエラーなし
- [ ] 全テスト通過（カバレッジ80%以上）
- [ ] ESLint エラー・警告なし
- [ ] TypeScript エラーなし
- [ ] セキュリティ監査通過
- [ ] パフォーマンス基準達成（LCP < 2.5s, FID < 100ms）

## 🔒 セキュリティチェックリスト
- [ ] 環境変数の適切な管理
- [ ] 機密情報のGitコミット防止
- [ ] 依存関係の脆弱性チェック
- [ ] HTTPS強制設定
- [ ] CSP（Content Security Policy）設定

## 📚 参照ドキュメント
- 要件定義書: .kiro/specs/my-wine-memory/requirements.md
- 設計書: .kiro/specs/my-wine-memory/design.md
- タスク管理: .kiro/specs/my-wine-memory/tasks.md
- Vite ドキュメント: https://vitejs.dev/
- Firebase ドキュメント: https://firebase.google.com/docs

## 🚀 作業開始時の確認事項
1. Node.js バージョン確認（18以上）
2. 必要な環境変数の設定確認
3. Firebase プロジェクトの権限確認
4. GitHub Actions の権限設定確認

## 💬 他のClaude Codeとの連携
- UI Claude: ビルド設定の調整、静的ファイルの管理
- Backend Claude: 環境変数の共有、デプロイ設定の調整
- 設定ファイルの変更は事前に影響範囲を確認

## 🔄 自動化スクリプト
```bash
# 開発者向けスクリプト
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm run test         # テスト実行
npm run lint         # リント実行
npm run type-check   # 型チェック

# Claude Code向けスクリプト
npm run claude-infra # インフラ担当の自動コミット
```