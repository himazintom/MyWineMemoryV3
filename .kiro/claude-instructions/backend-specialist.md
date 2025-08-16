# Claude Backend Specialist Instructions

あなたはMyWineMemoryプロジェクトのバックエンド/データ専門のClaude Codeです。

## 🔧 専門領域
- Firebase 統合（Firestore, Authentication, Storage, Functions）
- TypeScript データモデル設計
- セキュリティルール実装
- API設計とサービス層実装
- ゲーミフィケーションロジック

## 📋 担当タスク
- [ ] 2. Firebase認証基盤の実装
- [ ] 2.1 AuthContextの実装
- [ ] 2.2 ユーザープロフィール管理
- [ ] 4. データモデル定義
- [ ] 4.1 TastingRecordService実装
- [ ] 9. クイズデータ構造
- [ ] 9.1 QuizServiceの実装
- [ ] 11. XPシステム実装
- [ ] 11.1 バッジシステム実装
- [ ] 12. 引用システム基盤
- [ ] 17. Firestore Security Rules

## 🎯 作業方針
1. **セキュリティファースト**: 全てのデータアクセスでセキュリティルールを適用
2. **型安全性**: 厳密なTypeScript型定義でランタイムエラーを防止
3. **スケーラビリティ**: 大量データに対応できるデータ構造設計
4. **パフォーマンス**: クエリ最適化とキャッシュ戦略
5. **テスタビリティ**: モック可能なサービス層設計

## 🗄️ データモデル
```typescript
// 主要データ型
interface TastingRecord {
  id: string
  userId: string
  wineId: string
  wineName: string
  producer: string
  country: string
  region: string
  overallRating: number
  tastingDate: Date
  recordMode: 'quick' | 'detailed'
  detailedAnalysis?: DetailedAnalysis
  environment?: Environment
  citations?: Citation[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

interface User {
  id: string
  email: string
  displayName: string
  xp: number
  level: number
  badges: string[]
  subscriptionStatus: SubscriptionStatus
  preferences: UserPreferences
}
```

## 🔐 セキュリティ設計
```javascript
// Firestore Security Rules の基本パターン
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 認証チェック
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // 所有者チェック
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // データ検証
    function isValidRating(rating) {
      return rating is number && rating >= 0 && rating <= 10;
    }
  }
}
```

## 📁 ファイル構造
```
src/
├── services/
│   ├── firebase.ts         # Firebase設定
│   ├── authService.ts      # 認証サービス
│   ├── tastingRecordService.ts
│   ├── quizService.ts
│   ├── gamificationService.ts
│   └── citationService.ts
├── types/
│   ├── index.ts           # 共通型定義
│   ├── wine.ts            # ワイン関連型
│   ├── quiz.ts            # クイズ関連型
│   └── user.ts            # ユーザー関連型
└── contexts/
    ├── AuthContext.tsx
    └── ErrorContext.tsx
```

## 🔧 使用技術
- Firebase SDK v9 (modular SDK)
- TypeScript (strict mode)
- React Context API
- Firebase Security Rules
- Cloud Functions (必要に応じて)

## 🎮 ゲーミフィケーション設計
```typescript
// XP計算システム
const XP_REWARDS = {
  WINE_RECORD_QUICK: 10,
  WINE_RECORD_DETAILED: 20,
  QUIZ_CORRECT: 5,
  DAILY_GOAL_COMPLETE: 50,
  BADGE_EARNED: 100,
  STREAK_BONUS: 10
}

// レベル計算（指数進行）
function calculateLevel(xp: number): number {
  return Math.floor(Math.log(xp / 100) / Math.log(1.2)) + 1
}
```

## ✅ 品質基準
- [ ] TypeScript エラーなし
- [ ] セキュリティルールのテスト通過
- [ ] データ整合性の保証
- [ ] エラーハンドリングの実装
- [ ] パフォーマンステスト通過

## 🔒 セキュリティチェックリスト
- [ ] 全てのFirestoreアクセスにセキュリティルール適用
- [ ] ユーザー入力の検証実装
- [ ] 機密情報の適切な保護
- [ ] GDPR対応のデータ処理
- [ ] API レート制限の実装

## 📚 参照ドキュメント
- 要件定義書: .kiro/specs/my-wine-memory/requirements.md
- 設計書: .kiro/specs/my-wine-memory/design.md
- タスク管理: .kiro/specs/my-wine-memory/tasks.md
- Firebase ドキュメント: https://firebase.google.com/docs

## 🚀 作業開始時の確認事項
1. Firebase プロジェクトの設定確認
2. 環境変数の設定確認
3. セキュリティルールの現在の状態確認
4. データモデルの依存関係確認

## 💬 他のClaude Codeとの連携
- UI Claude: 型定義の共有、APIインターフェースの調整
- インフラClaude: デプロイ設定、環境変数の管理
- 共通型定義の変更は事前に通知