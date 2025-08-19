#!/usr/bin/env node

/**
 * コミット分析ツール
 * Gitフック用の高速コミット分析機能
 */

import { execSync } from 'child_process'

export interface CommitAnalysis {
  risk: 'low' | 'medium' | 'high'
  filesChanged: number
  linesAdded: number
  linesDeleted: number
  hasSecurityConcerns: boolean
  hasBreakingChanges: boolean
  hasTesting: boolean
  categories: string[]
  suggestions: string[]
}

export class CommitAnalyzer {
  /**
   * ステージされた変更を分析
   */
  analyzeStagedChanges(): CommitAnalysis {
    const stagedFiles = this.getStagedFiles()
    const diffStat = this.getDiffStats()
    
    const analysis: CommitAnalysis = {
      risk: 'low',
      filesChanged: stagedFiles.length,
      linesAdded: diffStat.additions,
      linesDeleted: diffStat.deletions,
      hasSecurityConcerns: false,
      hasBreakingChanges: false,
      hasTesting: false,
      categories: [],
      suggestions: []
    }

    // リスク評価
    analysis.risk = this.calculateRisk(analysis)
    
    // カテゴリ分析
    analysis.categories = this.categorizeChanges(stagedFiles)
    
    // セキュリティ懸念チェック
    analysis.hasSecurityConcerns = this.checkSecurityConcerns(stagedFiles)
    
    // 破壊的変更チェック
    analysis.hasBreakingChanges = this.checkBreakingChanges(stagedFiles)
    
    // テスト有無チェック
    analysis.hasTesting = this.checkTestChanges(stagedFiles)
    
    // 提案生成
    analysis.suggestions = this.generateSuggestions(analysis)
    
    return analysis
  }

  /**
   * ステージされたファイル一覧取得
   */
  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      return output.trim().split('\n').filter(f => f.length > 0)
    } catch {
      return []
    }
  }

  /**
   * 差分統計取得
   */
  private getDiffStats(): { additions: number; deletions: number } {
    try {
      const output = execSync('git diff --cached --numstat', { encoding: 'utf8' })
      const lines = output.trim().split('\n').filter(l => l.length > 0)
      
      let additions = 0
      let deletions = 0
      
      lines.forEach(line => {
        const [add, del] = line.split('\t')
        if (add !== '-') additions += parseInt(add) || 0
        if (del !== '-') deletions += parseInt(del) || 0
      })
      
      return { additions, deletions }
    } catch {
      return { additions: 0, deletions: 0 }
    }
  }

  /**
   * リスク計算
   */
  private calculateRisk(analysis: CommitAnalysis): 'low' | 'medium' | 'high' {
    let riskScore = 0
    
    // ファイル数による評価
    if (analysis.filesChanged > 20) riskScore += 3
    else if (analysis.filesChanged > 10) riskScore += 2
    else if (analysis.filesChanged > 5) riskScore += 1
    
    // 変更行数による評価
    const totalChanges = analysis.linesAdded + analysis.linesDeleted
    if (totalChanges > 1000) riskScore += 3
    else if (totalChanges > 500) riskScore += 2
    else if (totalChanges > 200) riskScore += 1
    
    // セキュリティ・破壊的変更
    if (analysis.hasSecurityConcerns) riskScore += 2
    if (analysis.hasBreakingChanges) riskScore += 2
    
    // テスト不足
    if (!analysis.hasTesting && analysis.filesChanged > 3) riskScore += 1
    
    if (riskScore >= 5) return 'high'
    if (riskScore >= 3) return 'medium'
    return 'low'
  }

  /**
   * 変更カテゴリ分析
   */
  private categorizeChanges(files: string[]): string[] {
    const categories: string[] = []
    
    // フロントエンド
    if (files.some(f => f.match(/src\/(components|pages|hooks)/))) {
      categories.push('frontend')
    }
    
    // バックエンド/サービス
    if (files.some(f => f.match(/src\/services/))) {
      categories.push('services')
    }
    
    // テスト
    if (files.some(f => f.match(/(test|spec|__tests__|e2e)/))) {
      categories.push('testing')
    }
    
    // 設定
    if (files.some(f => f.match(/(config|\.json|\.ts$|\.js$)/) && !f.includes('src/'))) {
      categories.push('config')
    }
    
    // ドキュメント
    if (files.some(f => f.match(/\.(md|txt|doc)$/))) {
      categories.push('docs')
    }
    
    // スタイル
    if (files.some(f => f.match(/\.(css|scss|sass|less)$/))) {
      categories.push('styles')
    }
    
    // ビルド/CI
    if (files.some(f => f.match(/(webpack|vite|rollup|\.github|scripts)/))) {
      categories.push('build')
    }
    
    return categories
  }

  /**
   * セキュリティ懸念チェック
   */
  private checkSecurityConcerns(files: string[]): boolean {
    // 機密ファイルの変更
    const sensitiveFiles = [
      '.env', '.env.local', '.env.production',
      'firebase.json', '.firebaserc',
      'package.json'
    ]
    
    if (files.some(f => sensitiveFiles.includes(f))) {
      return true
    }
    
    // 認証・セキュリティ関連ファイル
    if (files.some(f => f.match(/(auth|security|crypto|token|key)/i))) {
      return true
    }
    
    return false
  }

  /**
   * 破壊的変更チェック
   */
  private checkBreakingChanges(files: string[]): boolean {
    // API/インターフェース変更の可能性
    if (files.some(f => f.match(/(types|interfaces|api|service)/))) {
      try {
        const diff = execSync('git diff --cached', { encoding: 'utf8' })
        
        // 関数シグネチャ変更
        if (diff.match(/^-.*function.*\(/gm)) return true
        
        // インターフェース変更
        if (diff.match(/^-.*interface/gm)) return true
        
        // エクスポート変更
        if (diff.match(/^-.*export/gm)) return true
        
      } catch {
        // diff取得失敗は無視
      }
    }
    
    return false
  }

  /**
   * テスト変更チェック
   */
  private checkTestChanges(files: string[]): boolean {
    return files.some(f => f.match(/(test|spec|__tests__|e2e)/))
  }

  /**
   * 提案生成
   */
  private generateSuggestions(analysis: CommitAnalysis): string[] {
    const suggestions: string[] = []
    
    if (analysis.risk === 'high') {
      suggestions.push('大きな変更です。複数のコミットに分割を検討してください')
    }
    
    if (analysis.hasSecurityConcerns) {
      suggestions.push('セキュリティ関連の変更があります。レビューを推奨します')
    }
    
    if (analysis.hasBreakingChanges) {
      suggestions.push('破壊的変更の可能性があります。バージョン番号の確認をお願いします')
    }
    
    if (!analysis.hasTesting && analysis.categories.includes('frontend')) {
      suggestions.push('フロントエンド変更にテストの追加を検討してください')
    }
    
    if (analysis.categories.includes('config') && analysis.filesChanged > 1) {
      suggestions.push('設定変更と機能変更は分離することを推奨します')
    }
    
    if (analysis.filesChanged > 15) {
      suggestions.push('多数のファイル変更があります。関連性を確認してください')
    }
    
    return suggestions
  }

  /**
   * 分析結果の表示
   */
  displayAnalysis(analysis: CommitAnalysis): void {
    console.log('\n📊 コミット分析結果:')
    console.log(`  🎯 リスク: ${this.getRiskEmoji(analysis.risk)} ${analysis.risk.toUpperCase()}`)
    console.log(`  📁 変更ファイル: ${analysis.filesChanged}`)
    console.log(`  📈 追加行数: +${analysis.linesAdded}`)
    console.log(`  📉 削除行数: -${analysis.linesDeleted}`)
    
    if (analysis.categories.length > 0) {
      console.log(`  🏷️  カテゴリ: ${analysis.categories.join(', ')}`)
    }
    
    if (analysis.hasSecurityConcerns) {
      console.log('  🔒 セキュリティ関連の変更あり')
    }
    
    if (analysis.hasBreakingChanges) {
      console.log('  ⚠️  破壊的変更の可能性あり')
    }
    
    if (analysis.suggestions.length > 0) {
      console.log('\n💡 提案:')
      analysis.suggestions.forEach(s => console.log(`  - ${s}`))
    }
    
    console.log('')
  }

  private getRiskEmoji(risk: string): string {
    switch (risk) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🔴'
      default: return '⚪'
    }
  }
}

// CLI実行
if (require.main === module) {
  const analyzer = new CommitAnalyzer()
  const analysis = analyzer.analyzeStagedChanges()
  analyzer.displayAnalysis(analysis)
  
  // 高リスクの場合は警告終了コード
  if (analysis.risk === 'high') {
    process.exit(2) // 警告レベル
  }
}

export default CommitAnalyzer