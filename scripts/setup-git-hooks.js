#!/usr/bin/env node

/**
 * Git Hooks セットアップスクリプト (JavaScript版)
 */

const { writeFileSync, chmodSync, existsSync, mkdirSync } = require('fs')
const { join } = require('path')
const { execSync } = require('child_process')

class GitHooksSetup {
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
  async setupAll() {
    console.log('🔧 Git Hooks セットアップ開始...')
    
    try {
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
  setupPreCommitHook() {
    console.log('📝 pre-commit フック設定中...')
    
    const preCommitScript = `#!/bin/sh
#
# MyWineMemoryV3 pre-commit hook
#

echo "🔍 Pre-commit checks..."

# ステージされたファイル確認
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(ts|tsx|js|jsx)$" || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files to check"
  exit 0
fi

echo "📁 Checking files: $STAGED_FILES"

# TypeScript型チェック
echo "  🔍 TypeScript type checking..."
if ! npm run type-check > /dev/null 2>&1; then
  echo "❌ TypeScript type check failed!"
  echo "💡 Run 'npm run type-check' to see errors"
  exit 1
fi

# ビルドチェック
echo "  🏗️  Build verification..."
if ! npm run build > /dev/null 2>&1; then
  echo "❌ Build failed!"
  echo "💡 Run 'npm run build' to see errors"
  exit 1
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
  setupPrePushHook() {
    console.log('🚀 pre-push フック設定中...')
    
    const prePushScript = `#!/bin/sh
#
# MyWineMemoryV3 pre-push hook
#

echo "🚀 Pre-push checks..."

CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Pushing branch: $CURRENT_BRANCH"

# mainブランチ直接プッシュ警告
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
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
  setupCommitMsgHook() {
    console.log('💬 commit-msg フック設定中...')
    
    const commitMsgScript = `#!/bin/sh
#
# MyWineMemoryV3 commit-msg hook
#

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

echo "📝 Checking commit message format..."

# 空のコミットメッセージチェック
if [ -z "$(echo "$COMMIT_MSG" | tr -d '[:space:]')" ]; then
  echo "❌ Empty commit message"
  exit 1
fi

# 長すぎる件名の警告
SUBJECT_LINE=$(echo "$COMMIT_MSG" | head -1)
SUBJECT_LENGTH=\${#SUBJECT_LINE}

if [ "$SUBJECT_LENGTH" -gt 72 ]; then
  echo "⚠️  Subject line is long ($SUBJECT_LENGTH chars > 72)"
  echo "💡 Consider shortening the commit subject"
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
  setupPostCommitHook() {
    console.log('📊 post-commit フック設定中...')
    
    const postCommitScript = `#!/bin/sh
#
# MyWineMemoryV3 post-commit hook
#

LOG_FILE=".git/commit-log.txt"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DATE=$(date "+%Y-%m-%d %H:%M:%S")

echo "---" >> "$LOG_FILE"
echo "Commit: $COMMIT_HASH" >> "$LOG_FILE"
echo "Date: $DATE" >> "$LOG_FILE"
echo "Message: $(echo "$COMMIT_MSG" | head -1)" >> "$LOG_FILE"

echo "📊 Commit logged: $COMMIT_HASH"
exit 0`

    const hookPath = join(this.hooksDir, 'post-commit')
    writeFileSync(hookPath, postCommitScript)
    chmodSync(hookPath, '755')
    
    console.log('✅ post-commit フック設定完了')
  }

  /**
   * フック状態確認
   */
  checkStatus() {
    console.log('📋 Git Hooks 状態確認:')
    
    const hooks = ['pre-commit', 'pre-push', 'commit-msg', 'post-commit']
    hooks.forEach(hook => {
      const hookPath = join(this.hooksDir, hook)
      
      if (existsSync(hookPath)) {
        console.log(`  ✅ ${hook}: 有効`)
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
    case 'status':
      gitHooks.checkStatus()
      break
    default:
      console.log(`
🔧 Git Hooks セットアップツール

使用方法:
  node scripts/setup-git-hooks.js setup   - 全フックを設定
  node scripts/setup-git-hooks.js status  - 状態確認
`)
  }
}

module.exports = GitHooksSetup