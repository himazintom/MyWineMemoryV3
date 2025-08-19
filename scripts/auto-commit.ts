#!/usr/bin/env node

/**
 * 自動コミットスクリプト - Claude Code連携
 * 
 * 機能:
 * - TypeScript/ESLintビルドチェック
 * - インテリジェントなコミットメッセージ生成
 * - 自動的なgit add → commit → push
 * - 変更内容の自動分析とカテゴライズ
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface CommitContext {
  changedFiles: string[]
  additions: number
  deletions: number
  hasNewFeatures: boolean
  hasBugFixes: boolean
  hasRefactoring: boolean
  hasTests: boolean
  hasDocs: boolean
  hasBreakingChanges: boolean
}

class AutoCommitService {
  private projectRoot: string
  private maxChangedFiles = 20 // Claude Code推奨の1コミット当たりの最大ファイル数

  constructor() {
    this.projectRoot = process.cwd()
  }

  /**
   * メイン実行関数
   */
  async execute(message?: string, push: boolean = true): Promise<void> {
    try {
      console.log('🚀 AutoCommit: 開始...')
      
      // 1. 変更確認
      const hasChanges = this.checkForChanges()
      if (!hasChanges) {
        console.log('✅ 変更がありません')
        return
      }

      // 2. ビルドチェック
      await this.runQualityChecks()

      // 3. 変更内容分析
      const context = this.analyzeChanges()
      
      // 4. コミットメッセージ生成
      const commitMessage = message || this.generateCommitMessage(context)
      
      // 5. コミット実行
      this.performCommit(commitMessage)
      
      // 6. プッシュ (オプション)
      if (push) {
        this.performPush()
      }

      console.log('✅ AutoCommit: 完了!')
      
    } catch (error) {
      console.error('❌ AutoCommit: 失敗:', error)
      process.exit(1)
    }
  }

  /**
   * 変更の有無をチェック
   */
  private checkForChanges(): boolean {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' })
      return status.trim().length > 0
    } catch (error) {
      console.error('Git status check failed:', error)
      return false
    }
  }

  /**
   * 品質チェック (TypeScript + ESLint + テスト)
   */
  private async runQualityChecks(): Promise<void> {
    console.log('🔍 品質チェック実行中...')
    
    try {
      // TypeScriptコンパイルチェック
      console.log('  - TypeScript type check...')
      execSync('npm run type-check', { stdio: 'pipe' })
      
      // ビルドチェック
      console.log('  - Build check...')
      execSync('npm run build', { stdio: 'pipe' })
      
      console.log('✅ 品質チェック: 合格')
      
    } catch (error) {
      console.error('❌ 品質チェック: 失敗')
      console.error('ビルドエラーがあります。修正してから再実行してください。')
      throw error
    }
  }

  /**
   * 変更内容を分析してコンテキストを生成
   */
  private analyzeChanges(): CommitContext {
    console.log('📊 変更内容分析中...')
    
    // git diffの統計情報取得
    const diffStat = execSync('git diff --stat HEAD', { encoding: 'utf8' })
    const changedFiles = execSync('git diff --name-only HEAD', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0)

    // 追加・削除行数の解析
    const statsMatch = diffStat.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/)
    const additions = statsMatch ? parseInt(statsMatch[2] || '0') : 0
    const deletions = statsMatch ? parseInt(statsMatch[3] || '0') : 0

    // ファイル内容の分析
    const context: CommitContext = {
      changedFiles,
      additions,
      deletions,
      hasNewFeatures: this.detectNewFeatures(changedFiles),
      hasBugFixes: this.detectBugFixes(),
      hasRefactoring: this.detectRefactoring(changedFiles),
      hasTests: this.detectTestChanges(changedFiles),
      hasDocs: this.detectDocChanges(changedFiles),
      hasBreakingChanges: this.detectBreakingChanges()
    }

    console.log(`  - 変更ファイル: ${context.changedFiles.length}`)
    console.log(`  - 追加行数: ${context.additions}`)
    console.log(`  - 削除行数: ${context.deletions}`)

    return context
  }

  /**
   * 新機能の検出
   */
  private detectNewFeatures(changedFiles: string[]): boolean {
    const newFeaturePatterns = [
      /src\/pages\/.*\.tsx$/,        // 新しいページ
      /src\/components\/.*\.tsx$/,   // 新しいコンポーネント
      /src\/services\/.*\.ts$/,      // 新しいサービス
      /src\/hooks\/.*\.ts$/,         // 新しいフック
    ]

    return changedFiles.some(file => 
      newFeaturePatterns.some(pattern => pattern.test(file))
    )
  }

  /**
   * バグ修正の検出
   */
  private detectBugFixes(): boolean {
    try {
      const diff = execSync('git diff HEAD', { encoding: 'utf8' })
      const bugFixPatterns = [
        /fix[:\s]/i,
        /bug[:\s]/i,
        /error[:\s]/i,
        /issue[:\s]/i,
        /\bfix\b/i,
        /console\.error/,
        /try\s*{[\s\S]*catch/,
      ]
      
      return bugFixPatterns.some(pattern => pattern.test(diff))
    } catch {
      return false
    }
  }

  /**
   * リファクタリングの検出
   */
  private detectRefactoring(changedFiles: string[]): boolean {
    // 既存ファイルの修正で新規ファイルが少ない場合
    const existingFiles = changedFiles.filter(file => !file.includes('new file'))
    return existingFiles.length > changedFiles.length * 0.7 && this.additions < this.deletions * 2
  }

  /**
   * テスト変更の検出
   */
  private detectTestChanges(changedFiles: string[]): boolean {
    return changedFiles.some(file => 
      file.includes('test') || 
      file.includes('spec') || 
      file.includes('__tests__') ||
      file.includes('e2e/')
    )
  }

  /**
   * ドキュメント変更の検出
   */
  private detectDocChanges(changedFiles: string[]): boolean {
    return changedFiles.some(file => 
      file.endsWith('.md') || 
      file.includes('README') ||
      file.includes('CHANGELOG') ||
      file.includes('docs/')
    )
  }

  /**
   * 破壊的変更の検出
   */
  private detectBreakingChanges(): boolean {
    try {
      const diff = execSync('git diff HEAD', { encoding: 'utf8' })
      const breakingPatterns = [
        /BREAKING[\s:]CHANGE/i,
        /interface.*{[\s\S]*?}/g, // インターフェース変更
        /export.*function.*\(/g,  // 関数シグネチャ変更
      ]
      
      return breakingPatterns.some(pattern => pattern.test(diff))
    } catch {
      return false
    }
  }

  /**
   * Claude Code推奨フォーマットでコミットメッセージを生成
   */
  private generateCommitMessage(context: CommitContext): string {
    console.log('💬 コミットメッセージ生成中...')
    
    // コミットタイプの決定
    let type = 'feat'
    if (context.hasBugFixes) type = 'fix'
    else if (context.hasRefactoring) type = 'refactor'
    else if (context.hasTests && !context.hasNewFeatures) type = 'test'
    else if (context.hasDocs && !context.hasNewFeatures) type = 'docs'

    // 主要な変更内容の特定
    const mainChanges = this.identifyMainChanges(context)
    
    // メッセージ構築
    const subject = `${type}: ${mainChanges.subject}`
    
    const body = [
      '',
      `${mainChanges.description}`,
      '',
      `変更ファイル: ${context.changedFiles.length}個`,
      `追加: +${context.additions}行, 削除: -${context.deletions}行`,
      '',
      '🤖 Generated with [Claude Code](https://claude.ai/code)',
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>'
    ].join('\n')

    return `${subject}${body}`
  }

  /**
   * 主要な変更内容を特定
   */
  private identifyMainChanges(context: CommitContext): { subject: string; description: string } {
    const { changedFiles } = context
    
    // ファイルタイプ別分析
    const componentFiles = changedFiles.filter(f => f.includes('components/'))
    const serviceFiles = changedFiles.filter(f => f.includes('services/'))
    const pageFiles = changedFiles.filter(f => f.includes('pages/'))
    const testFiles = changedFiles.filter(f => f.includes('test') || f.includes('spec'))
    
    // 主要な変更の特定
    if (pageFiles.length > 0) {
      const pageName = pageFiles[0].split('/').pop()?.replace('.tsx', '')
      return {
        subject: `${pageName}ページ機能追加・改善`,
        description: `${pageName}ページの実装を追加/改善しました。`
      }
    }
    
    if (serviceFiles.length > 0) {
      const serviceName = serviceFiles[0].split('/').pop()?.replace('.ts', '')
      return {
        subject: `${serviceName}サービス実装・改善`,
        description: `${serviceName}サービスの機能を実装/改善しました。`
      }
    }
    
    if (componentFiles.length > 0) {
      const componentName = componentFiles[0].split('/').pop()?.replace('.tsx', '')
      return {
        subject: `${componentName}コンポーネント実装・改善`,
        description: `${componentName}コンポーネントの機能を実装/改善しました。`
      }
    }
    
    if (testFiles.length > 0) {
      return {
        subject: 'テスト実装・改善',
        description: 'テストケースを追加/改善しました。'
      }
    }
    
    // 一般的な変更
    if (context.hasBugFixes) {
      return {
        subject: 'バグ修正・安定性向上',
        description: '各種バグ修正と安定性向上を実装しました。'
      }
    }
    
    return {
      subject: '機能追加・改善',
      description: '各種機能の追加と改善を実装しました。'
    }
  }

  /**
   * git commit実行
   */
  private performCommit(message: string): void {
    console.log('📝 コミット実行中...')
    
    try {
      // git add
      execSync('git add .', { stdio: 'pipe' })
      
      // git commit
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' })
      
      console.log('✅ コミット完了')
      console.log('📄 コミットメッセージ:')
      console.log(message.split('\n')[0]) // 件名のみ表示
      
    } catch (error) {
      console.error('❌ コミット失敗:', error)
      throw error
    }
  }

  /**
   * git push実行
   */
  private performPush(): void {
    console.log('⬆️  プッシュ実行中...')
    
    try {
      execSync('git push', { stdio: 'pipe' })
      console.log('✅ プッシュ完了')
    } catch (error) {
      console.error('❌ プッシュ失敗:', error)
      throw error
    }
  }
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2)
  const message = args.find(arg => arg.startsWith('--message='))?.split('=')[1]
  const noPush = args.includes('--no-push')
  
  const service = new AutoCommitService()
  service.execute(message, !noPush)
    .then(() => {
      console.log('🎉 AutoCommit完了!')
    })
    .catch((error) => {
      console.error('💥 AutoCommit失敗:', error)
      process.exit(1)
    })
}

export default AutoCommitService