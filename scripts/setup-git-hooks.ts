#!/usr/bin/env node

/**
 * Git Hooks セットアップスクリプト
 * 
 * MyWineMemoryV3プロジェクト用のGitフック設定:
 * - pre-commit: TypeScript型チェック、ESLint、ビルド確認
 * - pre-push: テスト実行、セキュリティチェック
 * - commit-msg: コミットメッセージフォーマットチェック
 * - post-commit: 自動ログ記録
 */

import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

class GitHooksSetup {
  private hooksDir: string
  private scriptsDir: string

  constructor() {
    this.hooksDir = join(process.cwd(), '.git', 'hooks')
    this.scriptsDir = join(process.cwd(), 'scripts', 'git-hooks')
    
    // git-hooksディレクトリ作成
    if (!existsSync(this.scriptsDir)) {
      mkdirSync(this.scriptsDir, { recursive: true })
    }
  }

  /**
   * 全Gitフックのセットアップ
   */
  async setupAll(): Promise<void> {
    console.log('🔧 Git Hooks セットアップ開始...')
    
    try {
      // Huskyの代わりに直接Gitフックを設定
      this.setupPreCommitHook()
      this.setupPrePushHook()
      this.setupCommitMsgHook()
      this.setupPostCommitHook()
      
      console.log('✅ Git Hooks セットアップ完了!')
      console.log('📋 設定されたフック:')
      console.log('  - pre-commit: 型チェック + ESLint + ビルド')
      console.log('  - pre-push: テスト実行 + セキュリティ')
      console.log('  - commit-msg: メッセージフォーマット')
      console.log('  - post-commit: ログ記録')
      
    } catch (error) {
      console.error('❌ Git Hooks セットアップ失敗:', error)
      throw error
    }
  }

  /**
   * pre-commit フック設定
   */
  private setupPreCommitHook(): void {
    console.log('📝 pre-commit フック設定中...')
    
    const preCommitScript = `#!/bin/sh
#
# MyWineMemoryV3 pre-commit hook
# TypeScript型チェック + ESLint + ビルド確認
#

echo "🔍 Pre-commit checks..."

# ステージされたファイルを取得
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|tsx|js|jsx)$" || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files to check"
  exit 0
fi

echo "📁 Checking files: $STAGED_FILES"

# 1. TypeScript型チェック
echo "  🔍 TypeScript type checking..."
if ! npm run type-check > /dev/null 2>&1; then
  echo "❌ TypeScript type check failed!"
  echo "💡 Run 'npm run type-check' to see errors"
  exit 1
fi

# 2. ビルドチェック
echo "  🏗️  Build verification..."
if ! npm run build > /dev/null 2>&1; then
  echo "❌ Build failed!"
  echo "💡 Run 'npm run build' to see errors"
  exit 1
fi

# 3. ステージされたファイルのみLint
echo "  🧹 Linting staged files..."
for FILE in $STAGED_FILES; do
  if [ -f "$FILE" ]; then
    if ! npx eslint "$FILE" > /dev/null 2>&1; then
      echo "⚠️  ESLint warnings in $FILE (allowed)"
    fi
  fi
done

# 4. 重要ファイルの変更警告
if echo "$STAGED_FILES" | grep -q "package.json\\|package-lock.json\\|tsconfig.json\\|vite.config.ts"; then
  echo "⚠️  重要な設定ファイルが変更されています:"
  echo "$STAGED_FILES" | grep -E "(package\\.json|package-lock\\.json|tsconfig\\.json|vite\\.config\\.ts)"
  echo "📋 変更内容を慎重に確認してください"
fi

# 5. 大量変更の警告
FILE_COUNT=$(echo "$STAGED_FILES" | wc -l)
if [ "$FILE_COUNT" -gt 15 ]; then
  echo "⚠️  多数のファイル変更 ($FILE_COUNT files)"
  echo "💡 複数のコミットに分割することを検討してください"
fi

echo "✅ Pre-commit checks passed!"
exit 0`

    const hookPath = join(this.hooksDir, 'pre-commit')
    writeFileSync(hookPath, preCommitScript)
    chmodSync(hookPath, '755')
    
    console.log('✅ pre-commit フック設定完了')
  }

  /**
   * pre-push フック設定
   */
  private setupPrePushHook(): void {
    console.log('🚀 pre-push フック設定中...')
    
    const prePushScript = `#!/bin/sh
#
# MyWineMemoryV3 pre-push hook  
# テスト実行 + セキュリティチェック
#

echo "🚀 Pre-push checks..."

# 現在のブランチ取得
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Pushing branch: $CURRENT_BRANCH"

# mainブランチへの直接プッシュ防止
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  # CI環境以外では警告
  if [ -z "$CI" ]; then
    echo "⚠️  mainブランチへの直接プッシュです"
    echo "❓ 本当に続行しますか? (y/N)"
    read -r CONFIRMATION
    if [ "$CONFIRMATION" != "y" ] && [ "$CONFIRMATION" != "Y" ]; then
      echo "❌ プッシュをキャンセルしました"
      exit 1
    fi
  fi
fi

# 1. 重要なテストを実行
echo "  🧪 Running critical tests..."
if ! npm run test --silent > /dev/null 2>&1; then
  echo "⚠️  Some tests failed (allowed for development)"
  echo "💡 Run 'npm run test' to check test status"
fi

# 2. セキュリティチェック
echo "  🔒 Security checks..."

# package.jsonの脆弱性チェック
if command -v npm > /dev/null; then
  if ! npm audit --audit-level high --production > /dev/null 2>&1; then
    echo "⚠️  Security vulnerabilities detected"
    echo "💡 Run 'npm audit' to review"
  fi
fi

# 機密情報の誤コミットチェック
echo "  🔍 Checking for secrets..."
SECRETS_PATTERNS="(password|secret|key|token|api_key|private).*=.*['\\\"][^'\\\"]{8,}"
if git diff HEAD~1..HEAD | grep -iE "$SECRETS_PATTERNS" > /dev/null 2>&1; then
  echo "⚠️  Potential secrets detected in commit"
  echo "🔍 Please review your changes for sensitive information"
fi

# 3. ビルドファイルサイズチェック
echo "  📦 Build size check..."
if [ -d "dist" ]; then
  DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1 || echo "unknown")
  echo "📊 Build size: $DIST_SIZE"
  
  # 異常に大きなビルドサイズの警告
  if [ -f "dist/assets/index-*.js" ]; then
    MAIN_JS_SIZE=$(ls -la dist/assets/index-*.js 2>/dev/null | awk '{print $5}' | head -1)
    if [ "$MAIN_JS_SIZE" -gt 2000000 ]; then # 2MB以上
      echo "⚠️  Main bundle size is large (>2MB)"
      echo "💡 Consider code splitting or optimization"
    fi
  fi
fi

echo "✅ Pre-push checks completed!"
exit 0`

    const hookPath = join(this.hooksDir, 'pre-push')
    writeFileSync(hookPath, prePushScript)
    chmodSync(hookPath, '755')
    
    console.log('✅ pre-push フック設定完了')
  }

  /**
   * commit-msg フック設定
   */
  private setupCommitMsgHook(): void {
    console.log('💬 commit-msg フック設定中...')
    
    const commitMsgScript = `#!/bin/sh
#
# MyWineMemoryV3 commit-msg hook
# コミットメッセージフォーマットチェック
#

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

echo "📝 Checking commit message format..."

# 空のコミットメッセージチェック
if [ -z "$(echo "$COMMIT_MSG" | tr -d '[:space:]')" ]; then
  echo "❌ Empty commit message"
  exit 1
fi

# Conventional Commits形式の推奨チェック
if echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"; then
  echo "✅ Conventional Commits format detected"
elif echo "$COMMIT_MSG" | grep -qE "^(Merge|Revert|Initial commit|WIP|work in progress)"; then
  echo "✅ Special commit type allowed"
elif echo "$COMMIT_MSG" | grep -q "Generated with.*Claude Code"; then
  echo "✅ Claude Code generated commit"
else
  echo "💡 Consider using Conventional Commits format:"
  echo "   feat: add new feature"
  echo "   fix: resolve bug"
  echo "   docs: update documentation"
  echo "   refactor: improve code structure"
  echo "   test: add or update tests"
  echo ""
  echo "📄 Current message: $(echo "$COMMIT_MSG" | head -1)"
  echo ""
  echo "❓ Continue anyway? (y/N)"
  
  # CI環境では自動承認
  if [ -n "$CI" ]; then
    echo "🤖 CI environment - auto-accepting"
    exit 0
  fi
  
  # インタラクティブ環境での確認
  if [ -t 0 ]; then
    read -r CONFIRMATION < /dev/tty
    if [ "$CONFIRMATION" != "y" ] && [ "$CONFIRMATION" != "Y" ]; then
      echo "❌ Commit cancelled"
      exit 1
    fi
  fi
fi

# 長すぎる件名の警告
SUBJECT_LINE=$(echo "$COMMIT_MSG" | head -1)
SUBJECT_LENGTH=${#SUBJECT_LINE}

if [ "$SUBJECT_LENGTH" -gt 72 ]; then
  echo "⚠️  Subject line is long ($SUBJECT_LENGTH chars > 72)"
  echo "💡 Consider shortening the commit subject"
fi

# 日本語文字化けチェック
if echo "$COMMIT_MSG" | grep -q "[\\x80-\\xFF]"; then
  echo "🌏 Non-ASCII characters detected (Japanese OK)"
fi

echo "✅ Commit message check passed!"
exit 0`

    const hookPath = join(this.hooksDir, 'commit-msg')
    writeFileSync(hookPath, commitMsgScript)
    chmodSync(hookPath, '755')
    
    console.log('✅ commit-msg フック設定完了')
  }

  /**
   * post-commit フック設定
   */
  private setupPostCommitHook(): void {
    console.log('📊 post-commit フック設定中...')
    
    const postCommitScript = `#!/bin/sh
#
# MyWineMemoryV3 post-commit hook
# コミット後の自動ログ記録
#

# ログファイルパス
LOG_FILE=".git/commit-log.txt"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
AUTHOR=$(git log -1 --pretty=%an)
DATE=$(date "+%Y-%m-%d %H:%M:%S")
BRANCH=$(git branch --show-current)

# コミット統計
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r "$COMMIT_HASH" | wc -l)
INSERTIONS=$(git diff-tree --no-commit-id --numstat -r "$COMMIT_HASH" | awk '{sum+=$1} END {print sum+0}')
DELETIONS=$(git diff-tree --no-commit-id --numstat -r "$COMMIT_HASH" | awk '{sum+=$2} END {print sum+0}')

# ログエントリ作成
echo "---" >> "$LOG_FILE"
echo "Commit: $COMMIT_HASH" >> "$LOG_FILE"
echo "Date: $DATE" >> "$LOG_FILE"
echo "Author: $AUTHOR" >> "$LOG_FILE"
echo "Branch: $BRANCH" >> "$LOG_FILE"
echo "Files: $FILES_CHANGED, +$INSERTIONS, -$DELETIONS" >> "$LOG_FILE"
echo "Message: $(echo "$COMMIT_MSG" | head -1)" >> "$LOG_FILE"

# Claude Code生成かチェック
if echo "$COMMIT_MSG" | grep -q "Generated with.*Claude Code"; then
  echo "Type: Claude Code Auto-commit" >> "$LOG_FILE"
fi

# プロジェクト統計更新（軽量）
TOTAL_COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "unknown")
echo "Total Commits: $TOTAL_COMMITS" >> "$LOG_FILE"

# 簡潔な成功メッセージ
echo "📊 Commit logged: $COMMIT_HASH ($(echo "$COMMIT_MSG" | head -1 | cut -c1-50)...)"

# 定期的にログファイルをクリーンアップ（1000行以上の場合）
if [ -f "$LOG_FILE" ]; then
  LINE_COUNT=$(wc -l < "$LOG_FILE")
  if [ "$LINE_COUNT" -gt 1000 ]; then
    tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
    echo "🧹 Commit log cleaned up (kept last 500 entries)"
  fi
fi

exit 0`

    const hookPath = join(this.hooksDir, 'post-commit')
    writeFileSync(hookPath, postCommitScript)
    chmodSync(hookPath, '755')
    
    console.log('✅ post-commit フック設定完了')
  }

  /**
   * フック無効化/有効化機能
   */
  disableHooks(): void {
    console.log('🔒 Git Hooks 一時無効化...')
    
    const hooks = ['pre-commit', 'pre-push', 'commit-msg', 'post-commit']
    hooks.forEach(hook => {
      const hookPath = join(this.hooksDir, hook)
      const disabledPath = join(this.hooksDir, `${hook}.disabled`)
      
      if (existsSync(hookPath)) {
        execSync(`mv "${hookPath}" "${disabledPath}"`)
      }
    })
    
    console.log('✅ Git Hooks 無効化完了')
  }

  enableHooks(): void {
    console.log('🔓 Git Hooks 有効化...')
    
    const hooks = ['pre-commit', 'pre-push', 'commit-msg', 'post-commit']
    hooks.forEach(hook => {
      const hookPath = join(this.hooksDir, hook)
      const disabledPath = join(this.hooksDir, `${hook}.disabled`)
      
      if (existsSync(disabledPath)) {
        execSync(`mv "${disabledPath}" "${hookPath}"`)
      }
    })
    
    console.log('✅ Git Hooks 有効化完了')
  }

  /**
   * フック状態確認
   */
  checkStatus(): void {
    console.log('📋 Git Hooks 状態確認:')
    
    const hooks = ['pre-commit', 'pre-push', 'commit-msg', 'post-commit']
    hooks.forEach(hook => {
      const hookPath = join(this.hooksDir, hook)
      const disabledPath = join(this.hooksDir, `${hook}.disabled`)
      
      if (existsSync(hookPath)) {
        console.log(`  ✅ ${hook}: 有効`)
      } else if (existsSync(disabledPath)) {
        console.log(`  ⏸️  ${hook}: 無効化中`)
      } else {
        console.log(`  ❌ ${hook}: 未設定`)
      }
    })
  }
}

// CLI実行
if (require.main === module) {
  const command = process.argv[2]
  const gitHooks = new GitHooksSetup()
  
  switch (command) {
    case 'setup':
      gitHooks.setupAll()
      break
    case 'disable':
      gitHooks.disableHooks()
      break
    case 'enable':
      gitHooks.enableHooks()
      break
    case 'status':
      gitHooks.checkStatus()
      break
    default:
      console.log(`
🔧 Git Hooks セットアップツール

使用方法:
  npm run git-hooks setup   - 全フックを設定
  npm run git-hooks disable - フックを一時無効化
  npm run git-hooks enable  - フックを有効化
  npm run git-hooks status  - 状態確認

設定されるフック:
  ✅ pre-commit: TypeScript + ESLint + ビルド
  ✅ pre-push: テスト + セキュリティチェック  
  ✅ commit-msg: メッセージフォーマット
  ✅ post-commit: ログ記録
`)
  }
}

export default GitHooksSetup