# Claude Code Hooks

このディレクトリには、Claude Codeの自動化フックが含まれています。

## 🚀 auto-workflow.ps1

ファイルの変更（Write/Edit/MultiEdit）が行われた際に自動実行される**インテリジェントワークフロー**です。

### 🔄 実行内容（リトライ機能付き）
1. **TypeScript型チェック** - `npm run type-check`（最大3回リトライ）
2. **ESLint実行** - `npm run lint`（自動修正付き）
3. **プロジェクトビルド** - `npm run build`（最大3回リトライ）
4. **変更のコミット** - `git add . && git commit`（全て成功時のみ）

### 🛠️ 自動エラー修正機能
- **ESLint自動修正**: `--fix`フラグで修正可能な問題を自動解決
- **エラーログ生成**: `.claude/build-errors.log`, `.claude/type-errors.log`
- **リトライ機構**: 各ステップで最大3回まで自動リトライ
- **エラー分析**: 詳細なエラーレポート生成

### 📋 エラーハンドリング
エラーが発生した場合：
1. **エラーログファイル作成** - 詳細な分析情報を含む
2. **自動修正試行** - ESLintルールなど修正可能な問題
3. **Claude Codeに通知** - 手動修正が必要な場合
4. **リトライ実行** - 修正後に自動的に再実行

### 📁 生成されるファイル
- `.claude/build-errors.log` - ビルドエラーの詳細
- `.claude/type-errors.log` - TypeScriptエラーの詳細
- `.claude/build-errors-analysis.md` - エラー分析レポート
- `.claude/type-errors-analysis.md` - 型エラー分析レポート

### ⚙️ 設定

`.claude/settings.local.json`で設定されています：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command", 
            "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/auto-workflow.ps1",
            "timeout": 300,
            "retryOnFailure": true
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "notification",
            "message": "🔄 Auto-workflow will run after file changes..."
          }
        ]
      }
    ]
  }
}
```

### 🎯 動作条件
- TypeScript型チェックが成功（最大3回リトライ）
- ESLintエラーなし（自動修正試行）
- ビルドが成功（最大3回リトライ）
- 変更がある場合のみコミット

### ⚠️ 注意事項
- 自動プッシュは無効化（安全のため手動プッシュ）
- エラーがある場合は自動コミットされません
- 各リトライ間に2秒の待機時間
- タイムアウト設定: 5分（300秒）

## 🔍 error-analyzer.ps1

エラーログを分析して修正提案を生成するヘルパースクリプトです。

### 機能
- **パターンマッチング**: 一般的なエラーパターンを検出
- **修正提案**: 具体的な修正方法を提示
- **分析レポート**: Markdown形式の詳細レポート生成

### 使用方法
```powershell
.\error-analyzer.ps1 -ErrorLogPath ".claude/build-errors.log" -ErrorType "build"
```

### カスタマイズ
- 最大リトライ回数: スクリプト内の`$MaxRetries`パラメータ
- 自動プッシュ有効化: スクリプト内のコメントアウト部分を有効化
- コミットメッセージ: `$CommitMessage`パラメータをカスタマイズ