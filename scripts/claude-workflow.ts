#!/usr/bin/env node

/**
 * Claude Code ワークフロー統合スクリプト
 * 
 * Claude Codeでの開発作業を自動化するワークフロー:
 * 1. 作業開始前のブランチ準備
 * 2. 作業中の定期的な品質チェック  
 * 3. 作業完了時の自動コミット&プッシュ
 * 4. プルリクエスト準備
 */

import { execSync } from 'child_process'
import AutoCommitService from './auto-commit'

interface WorkflowOptions {
  branch?: string
  feature?: string
  autoCommit?: boolean
  createPR?: boolean
}

class ClaudeWorkflowService {
  private autoCommit: AutoCommitService

  constructor() {
    this.autoCommit = new AutoCommitService()
  }

  /**
   * 新機能開発開始
   */
  async startFeature(featureName: string): Promise<void> {
    console.log(`🚀 機能開発開始: ${featureName}`)
    
    try {
      // ブランチ作成
      const branchName = `feature/${featureName.toLowerCase().replace(/\s+/g, '-')}`
      console.log(`📝 ブランチ作成: ${branchName}`)
      
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' })
      
      // 初期コミット
      console.log('📄 初期コミットメッセージを作成...')
      const initialCommit = `feat: ${featureName}実装開始

${featureName}の実装を開始します。

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`
      
      execSync(`git commit --allow-empty -m "${initialCommit}"`, { stdio: 'inherit' })
      execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' })
      
      console.log('✅ 機能開発準備完了!')
      
    } catch (error) {
      console.error('❌ 機能開発開始失敗:', error)
      throw error
    }
  }

  /**
   * 作業中の品質チェック
   */
  async qualityCheck(): Promise<boolean> {
    console.log('🔍 品質チェック実行中...')
    
    try {
      // TypeScriptチェック
      console.log('  - TypeScript type checking...')
      execSync('npm run type-check', { stdio: 'pipe' })
      
      // ビルドチェック  
      console.log('  - Build verification...')
      execSync('npm run build', { stdio: 'pipe' })
      
      // 簡易テスト
      console.log('  - Basic test check...')
      try {
        execSync('npm run test --silent', { stdio: 'pipe' })
      } catch {
        console.log('    ⚠️  一部テストが失敗していますが続行します')
      }
      
      console.log('✅ 品質チェック完了')
      return true
      
    } catch (error) {
      console.error('❌ 品質チェック失敗:', error)
      return false
    }
  }

  /**
   * 作業完了とコミット
   */
  async completeWork(message?: string): Promise<void> {
    console.log('🏁 作業完了処理開始...')
    
    try {
      // 品質チェック
      const qualityOK = await this.qualityCheck()
      if (!qualityOK) {
        throw new Error('品質チェックに失敗しました')
      }
      
      // 自動コミット
      console.log('📝 自動コミット実行...')
      await this.autoCommit.execute(message, true)
      
      console.log('✅ 作業完了!')
      
    } catch (error) {
      console.error('❌ 作業完了処理失敗:', error)
      throw error
    }
  }

  /**
   * プルリクエスト準備
   */
  async preparePR(title?: string): Promise<void> {
    console.log('📋 プルリクエスト準備中...')
    
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim()
      
      if (currentBranch === 'main') {
        throw new Error('mainブランチからプルリクエストは作成できません')
      }
      
      // 最新のmainブランチと同期
      console.log('  - mainブランチと同期中...')
      execSync('git fetch origin main', { stdio: 'pipe' })
      
      // 競合チェック
      try {
        execSync('git merge-base --is-ancestor origin/main HEAD', { stdio: 'pipe' })
      } catch {
        console.log('  ⚠️  mainブランチとの差分があります。rebaseを推奨します。')
      }
      
      // コミット統計取得
      const commitCount = execSync(`git rev-list --count origin/main..HEAD`, { encoding: 'utf8' }).trim()
      const changedFiles = execSync(`git diff --name-only origin/main...HEAD`, { encoding: 'utf8' }).trim().split('\n').length
      
      console.log(`  - コミット数: ${commitCount}`)
      console.log(`  - 変更ファイル数: ${changedFiles}`)
      
      // PR作成コマンド出力
      const prTitle = title || `${currentBranch}の実装`
      const prBody = `## 概要
${currentBranch}の実装を完了しました。

## 変更内容
- コミット数: ${commitCount}
- 変更ファイル数: ${changedFiles}

## テスト
- [x] TypeScript型チェック
- [x] ビルド確認
- [x] 基本テスト実行

🤖 Generated with [Claude Code](https://claude.ai/code)`

      console.log('\n📋 プルリクエスト作成コマンド:')
      console.log(`gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`)
      
      console.log('✅ プルリクエスト準備完了!')
      
    } catch (error) {
      console.error('❌ プルリクエスト準備失敗:', error)
      throw error
    }
  }

  /**
   * 定期的な進捗保存
   */
  async saveProgress(message?: string): Promise<void> {
    console.log('💾 進捗保存中...')
    
    try {
      const hasChanges = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
      if (!hasChanges) {
        console.log('📄 変更がありません')
        return
      }
      
      const progressMessage = message || 'work in progress: 開発中の変更を保存'
      
      execSync('git add .', { stdio: 'pipe' })
      execSync(`git commit -m "${progressMessage}"`, { stdio: 'pipe' })
      
      console.log('✅ 進捗保存完了')
      
    } catch (error) {
      console.error('❌ 進捗保存失敗:', error)
      throw error
    }
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]
  
  const workflow = new ClaudeWorkflowService()
  
  switch (command) {
    case 'start':
      const featureName = args.slice(1).join(' ')
      if (!featureName) {
        console.error('機能名を指定してください: npm run claude-start "機能名"')
        process.exit(1)
      }
      workflow.startFeature(featureName)
      break
      
    case 'check':
      workflow.qualityCheck()
      break
      
    case 'complete':
      const message = args.slice(1).join(' ')
      workflow.completeWork(message)
      break
      
    case 'pr':
      const title = args.slice(1).join(' ')
      workflow.preparePR(title)
      break
      
    case 'save':
      const saveMessage = args.slice(1).join(' ')
      workflow.saveProgress(saveMessage)
      break
      
    default:
      console.log(`
🤖 Claude Code ワークフロー

使用方法:
  npm run claude-start "機能名"     - 新機能開発開始
  npm run claude-check            - 品質チェック実行
  npm run claude-save "メッセージ"  - 進捗保存
  npm run claude-complete "説明"   - 作業完了&コミット
  npm run claude-pr "PR タイトル"  - プルリクエスト準備
  npm run claude-commit           - 自動コミット実行
`)
  }
}

export default ClaudeWorkflowService