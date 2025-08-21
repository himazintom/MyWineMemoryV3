# 🍷 MyWineMemory V3

**ワイン愛好家のための完全なデジタルテイスティングノート & 学習プラットフォーム**

## 📖 概要

MyWineMemory V3は、React + TypeScript + Firebaseで構築された高機能なワイン管理アプリケーションです。テイスティング記録からAI分析、クイズ学習まで、ワイン愛好家のすべてのニーズに対応します。

## ✨ 主な機能

### 🔖 テイスティング記録管理
- 詳細なワイン情報記録（品種、産地、ヴィンテージ等）
- 画像アップロード & 手描きメモ
- 評価・テイスティングノート
- 引用・参考文献管理

### 🤖 AI分析・推薦
- 味覚プロフィール自動分析
- パーソナライズドワイン推薦
- OpenRouter & Groq LLM統合
- 複数モデル対応（GPT、Llama等）

### 🎯 クイズ・学習システム
- 20レベル・300+問題の段階的学習
- ハートシステム（ライフ制限）
- 進捗トラッキング & 統計
- 難易度別コンテンツ

### 📊 統計・分析
- KPI管理（DAU、MAU、リテンション）
- テイスティング傾向分析
- 人気ワイン統計
- チャート可視化（Chart.js）

### 🔒 プライバシー・セキュリティ
- GDPR準拠データ管理
- データエクスポート・削除機能
- Sentry統合エラー監視
- セキュアなFirebase認証

### 📱 PWA対応
- オフライン機能
- プッシュ通知
- モバイル最適化
- インストール可能

## 🛠️ 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速ビルドツール
- **React Router** - ルーティング
- **Chart.js** - データ可視化

### バックエンド・インフラ
- **Firebase** - 認証・DB・ストレージ・ホスティング
  - Firestore - NoSQLデータベース
  - Firebase Auth - 認証システム
  - Cloud Storage - ファイルストレージ
  - Firebase Hosting - Webホスティング
- **OpenRouter/Groq** - LLM API
- **Sentry** - エラー監視

### 開発・運用
- **Jest + Testing Library** - テスト（118テスト・100%成功）
- **Playwright** - E2Eテスト
- **ESLint + Prettier** - コード品質
- **GitHub Actions** - CI/CD
- **Dependabot** - 依存関係管理

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- npm または yarn
- Firebase CLI
- Git

### インストール

```bash
# リポジトリクローン
git clone https://github.com/himazintom/MyWineMemoryV3.git
cd MyWineMemoryV3

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local にFirebase設定を記入

# 開発サーバー起動
npm run dev
```

### 環境変数

```env
# Firebase設定
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# LLM API設定
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_GROQ_API_KEY=your_groq_key

# オプション
VITE_SENTRY_DSN=your_sentry_dsn
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## 📋 利用可能なスクリプト

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# テスト実行
npm test
npm run test:coverage

# E2Eテスト
npm run test:e2e

# Lint・フォーマット
npm run lint
npm run format

# 型チェック
npm run type-check

# Firebase デプロイ
npm run deploy:production
npm run deploy:staging
```

## 🧪 テスト

### ユニットテスト
- **Jest + React Testing Library**
- **118テスト・100%成功**
- コンポーネント・フック・サービステスト

### E2Eテスト
- **Playwright**
- クロスブラウザ対応
- モバイル・デスクトップテスト

### テスト実行
```bash
# 全テスト実行
npm test

# カバレッジ付き
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

## 🚢 デプロイ

### Firebase Hosting
- **本番環境**: `https://mywinememoryv3.web.app`
- **ステージング**: 自動プレビューURL

### CI/CD パイプライン
- GitHub Actionsによる自動デプロイ
- PRプレビュー機能
- セキュリティスキャン
- Lighthouseパフォーマンステスト

## 📊 プロジェクト統計

- **開発期間**: 2024年8月
- **コード行数**: 20,000+ 行
- **コンポーネント数**: 50+ コンポーネント
- **テストカバレッジ**: 100%
- **タスク完了**: 65/65タスク（344サブタスク）

## 🔧 アーキテクチャ

### ディレクトリ構造
```
src/
├── components/          # UIコンポーネント
│   ├── common/         # 共通コンポーネント
│   ├── features/       # 機能固有コンポーネント
│   └── layout/         # レイアウトコンポーネント
├── pages/              # ページコンポーネント
├── services/           # ビジネスロジック・API
├── hooks/              # カスタムフック
├── contexts/           # React Context
├── types/              # TypeScript型定義
├── data/               # 静的データ
└── utils/              # ユーティリティ関数
```

### 状態管理
- React Context + Hooks
- ローカル状態管理
- Firebase Real-time同期

## 🤝 コントリビューション

1. Issue作成またはfeatureブランチ作成
2. 変更実装・テスト追加
3. PR作成（テンプレート使用）
4. レビュー・マージ

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 👨‍💻 開発者

**himazintom** - [GitHub](https://github.com/himazintom)

---

**🍷 Beautiful wine memories, enhanced by AI**