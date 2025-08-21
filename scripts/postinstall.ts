#!/usr/bin/env node

/**
 * postinstall スクリプト
 * npm install後の自動セットアップ
 */

import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

async function postInstallSetup(): Promise<void> {
  console.log('🔧 Post-install setup...')
  
  try {
    // Git repositoryかチェック
    if (!existsSync('.git')) {
      console.log('ℹ️  Not a git repository, skipping git hooks setup')
      return
    }
    
    // Git hooksの自動セットアップ
    console.log('⚙️  Setting up Git hooks...')
    execSync('npm run hooks:setup', { stdio: 'inherit' })
    
    console.log('✅ Post-install setup completed!')
    
  } catch (error) {
    console.warn('⚠️  Post-install setup failed (non-critical):', error)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  postInstallSetup()
}

export default postInstallSetup