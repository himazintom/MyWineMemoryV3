# Claude Code 自動ワークフロー

MyWineMemoryV3プロジェクトでのClaude Code連携開発ワークフローの説明です。

## 🚀 クイックスタート

### 新機能開発の開始
```bash
npm run claude-start "新機能名"
```
- 新しいfeatureブランチを作成
- 初期コミットを自動生成
- リモートにプッシュ

### 作業中の品質チェック
```bash
npm run claude-check
```
- TypeScript型チェック
- ビルド確認
- 基本テスト実行

### 進捗の保存
```bash
npm run claude-save "作業内容"
```
- 作業中の変更を一時保存
- コミットメッセージは自動生成

### 作業完了
```bash
npm run claude-complete
```
- 品質チェック実行
- 変更内容を自動分析
- インテリジェントなコミットメッセージ生成
- 自動コミット&プッシュ

### プルリクエスト準備
```bash
npm run claude-pr "PR タイトル"
```
- mainブランチとの同期確認
- PR作成コマンドを生成
- 変更統計を表示

## 🎯 推奨ワークフロー

### 1. 日常開発
```bash
# 1. 新機能開始
npm run claude-start "ユーザープロフィール画面改善"

# 2. 作業中 (適宜実行)
npm run claude-save "ユーザー情報表示部分完了"
npm run claude-check  # 品質確認

# 3. 作業完了
npm run claude-complete

# 4. PR作成
npm run claude-pr "ユーザープロフィール画面の機能改善"
```

### 2. 緊急修正
```bash
# 品質チェック + 自動コミット
npm run claude-complete
```

### 3. 実験的変更
```bash
# プッシュなしでコミットのみ
npm run auto-commit:no-push
```

## 🤖 自動機能

### インテリジェントコミットメッセージ
変更内容を自動分析して適切なコミットメッセージを生成：

- **feat**: 新機能追加
- **fix**: バグ修正
- **refactor**: リファクタリング
- **test**: テスト追加/修正
- **docs**: ドキュメント更新

### 品質保証
すべてのコミット前に自動実行：
- TypeScript型チェック
- ビルドエラー確認
- 基本的なテスト実行

### 変更分析
- 追加/削除行数の統計
- 変更ファイルの分類
- 新機能/バグ修正/リファクタリングの自動判定
- 破壊的変更の検出

## 📋 VS Code統合

### タスク実行
- `Ctrl+Shift+P` → "Tasks: Run Task"
- 以下のタスクが利用可能：
  - **Claude: Quality Check** - 品質チェック実行
  - **Claude: Auto Commit** - 自動コミット
  - **Claude: Save Progress** - 進捗保存
  - **Claude: Complete Work** - 作業完了

### キーボードショートカット (推奨)
`.vscode/keybindings.json`に追加：
```json
[
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.tasks.runTask",
    "args": "Claude: Complete Work"
  },
  {
    "key": "ctrl+alt+q", 
    "command": "workbench.action.tasks.runTask",
    "args": "Claude: Quality Check"
  }
]
```

## 🔧 カスタマイズ

### コミットメッセージ形式
`scripts/auto-commit.ts`の`generateCommitMessage()`で調整可能

### 品質チェック内容
`scripts/auto-commit.ts`の`runQualityChecks()`で変更可能

### ファイル分析ルール
各`detect**()`メソッドでパターンをカスタマイズ

## 📊 統計情報

自動コミット時に以下の情報を収集・表示：
- 変更ファイル数
- 追加/削除行数
- 変更カテゴリ（機能/修正/リファクタリング等）
- 主要な変更内容

## 🚫 注意事項

### 品質チェック失敗時
- TypeScriptエラーがある場合、コミットは中止されます
- ビルドエラーがある場合、コミットは中止されます
- 修正後に再実行してください

### 大きな変更の場合
- 20ファイル以上の変更は警告が表示されます
- 複数のコミットに分割することを推奨

### ブランチ運用
- mainブランチでの直接作業は推奨されません
- featureブランチでの作業を前提とした設計

## 🆘 トラブルシューティング

### TypeScriptエラー
```bash
npm run type-check
# エラー内容を確認して修正
```

### ビルドエラー
```bash
npm run build
# エラー内容を確認して修正
```

### Git関連エラー
```bash
git status
# 競合やuntracked filesを確認
```

## 🔗 関連コマンド

| コマンド | 説明 |
|---------|------|
| `npm run claude-start "機能名"` | 新機能開発開始 |
| `npm run claude-check` | 品質チェック |
| `npm run claude-save "説明"` | 進捗保存 |
| `npm run claude-complete` | 作業完了 |
| `npm run claude-pr "タイトル"` | PR準備 |
| `npm run auto-commit` | 自動コミット |
| `npm run auto-commit:no-push` | コミットのみ |

このワークフローにより、Claude Codeでの開発効率が大幅に向上し、一貫した品質でのコミット管理が可能になります。