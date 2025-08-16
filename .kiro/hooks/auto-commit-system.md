# Claude Code 自動コミット・プッシュシステム

## 🎯 概要

Claude Code が一定の変更を加えた際に、自動的にビルド → テスト → コミット → プッシュを実行するシステムです。

## 🔧 システム構成

### **1. Kiro Agent Hooks 設定**

```json
// .kiro/hooks/auto-commit.json
{
  "name": "Auto Commit & Push",
  "description": "Claude Code の変更を自動的にコミット・プッシュ",
  "trigger": {
    "type": "file_change",
    "patterns": [
      "src/**/*.ts",
      "src/**/*.tsx",
      "src/**/*.js",
      "src/**/*.jsx",
      "src/**/*.css",
      "src/**/*.scss"
    ],
    "debounce": 30000,
    "minChanges": 3
  },
  "conditions": [
    {
      "type": "git_status",
      "hasChanges": true
    },
    {
      "type": "build_ready",
      "noPendingOperations": true
    }
  ],
  "actions": [
    {
      "type": "run_script",
      "script": "scripts/auto-commit.js"
    }
  ]
}
```

### **2. 自動コミットスクリプト**

```javascript
// scripts/auto-commit.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoCommitSystem {
  constructor() {
    this.projectRoot = process.cwd();
    this.logFile = path.join(this.projectRoot, '.kiro/logs/auto-commit.log');
  }

  async execute() {
    try {
      this.log('🚀 自動コミットプロセス開始');
      
      // 1. 変更ファイルの確認
      const changedFiles = this.getChangedFiles();
      if (changedFiles.length === 0) {
        this.log('📝 変更ファイルなし - 処理終了');
        return;
      }

      // 2. ビルドチェック
      await this.runBuild();
      
      // 3. テスト実行
      await this.runTests();
      
      // 4. リントチェック
      await this.runLint();
      
      // 5. 型チェック
      await this.runTypeCheck();
      
      // 6. コミットメッセージ生成
      const commitMessage = this.generateCommitMessage(changedFiles);
      
      // 7. Git操作
      this.gitAdd(changedFiles);
      this.gitCommit(commitMessage);
      this.gitPush();
      
      this.log('✅ 自動コミット完了');
      
    } catch (error) {
      this.log(`❌ エラー発生: ${error.message}`);
      this.notifyError(error);
    }
  }

  getChangedFiles() {
    try {
      const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
      const stagedOutput = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      
      const changed = output.trim().split('\n').filter(f => f);
      const staged = stagedOutput.trim().split('\n').filter(f => f);
      
      return [...new Set([...changed, ...staged])];
    } catch (error) {
      return [];
    }
  }

  async runBuild() {
    this.log('🔨 ビルドチェック実行中...');
    try {
      execSync('npm run build', { 
        stdio: 'pipe',
        timeout: 120000 // 2分タイムアウト
      });
      this.log('✅ ビルド成功');
    } catch (error) {
      throw new Error(`ビルドエラー: ${error.message}`);
    }
  }

  async runTests() {
    this.log('🧪 テスト実行中...');
    try {
      execSync('npm run test -- --passWithNoTests', { 
        stdio: 'pipe',
        timeout: 60000 // 1分タイムアウト
      });
      this.log('✅ テスト成功');
    } catch (error) {
      throw new Error(`テストエラー: ${error.message}`);
    }
  }

  async runLint() {
    this.log('🔍 リントチェック実行中...');
    try {
      execSync('npm run lint', { 
        stdio: 'pipe',
        timeout: 30000 // 30秒タイムアウト
      });
      this.log('✅ リント成功');
    } catch (error) {
      // リントエラーは自動修正を試行
      try {
        execSync('npm run lint -- --fix', { stdio: 'pipe' });
        this.log('🔧 リント自動修正完了');
      } catch (fixError) {
        throw new Error(`リントエラー（修正不可）: ${error.message}`);
      }
    }
  }

  async runTypeCheck() {
    this.log('📝 型チェック実行中...');
    try {
      execSync('npm run type-check', { 
        stdio: 'pipe',
        timeout: 30000 // 30秒タイムアウト
      });
      this.log('✅ 型チェック成功');
    } catch (error) {
      throw new Error(`型エラー: ${error.message}`);
    }
  }

  generateCommitMessage(changedFiles) {
    const categories = this.categorizeFiles(changedFiles);
    const timestamp = new Date().toISOString();
    
    let type = 'chore';
    let scope = '';
    let description = '';
    
    // 変更の種類を判定
    if (categories.components.length > 0) {
      type = 'feat';
      scope = 'ui';
      description = `コンポーネント更新 (${categories.components.length}ファイル)`;
    } else if (categories.services.length > 0) {
      type = 'feat';
      scope = 'api';
      description = `サービス層更新 (${categories.services.length}ファイル)`;
    } else if (categories.types.length > 0) {
      type = 'refactor';
      scope = 'types';
      description = `型定義更新 (${categories.types.length}ファイル)`;
    } else if (categories.styles.length > 0) {
      type = 'style';
      description = `スタイル更新 (${categories.styles.length}ファイル)`;
    } else if (categories.tests.length > 0) {
      type = 'test';
      description = `テスト更新 (${categories.tests.length}ファイル)`;
    } else {
      description = `ファイル更新 (${changedFiles.length}ファイル)`;
    }

    const scopeStr = scope ? `(${scope})` : '';
    const shortMessage = `${type}${scopeStr}: ${description}`;
    
    // 詳細情報
    const details = [
      '',
      '🤖 Claude Code による自動コミット',
      `📅 ${timestamp}`,
      `📁 変更ファイル数: ${changedFiles.length}`,
      ''
    ];

    // カテゴリ別詳細
    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        details.push(`${this.getCategoryIcon(category)} ${category}: ${files.length}ファイル`);
        files.slice(0, 5).forEach(file => {
          details.push(`  - ${file}`);
        });
        if (files.length > 5) {
          details.push(`  - ... 他${files.length - 5}ファイル`);
        }
        details.push('');
      }
    });

    return shortMessage + '\n' + details.join('\n');
  }

  categorizeFiles(files) {
    return {
      components: files.filter(f => f.includes('/components/')),
      pages: files.filter(f => f.includes('/pages/')),
      services: files.filter(f => f.includes('/services/')),
      hooks: files.filter(f => f.includes('/hooks/')),
      types: files.filter(f => f.includes('/types/') || f.endsWith('.d.ts')),
      styles: files.filter(f => f.endsWith('.css') || f.endsWith('.scss')),
      tests: files.filter(f => f.includes('.test.') || f.includes('.spec.')),
      config: files.filter(f => f.includes('config') || f.endsWith('.json')),
      other: files.filter(f => !this.isKnownCategory(f))
    };
  }

  getCategoryIcon(category) {
    const icons = {
      components: '🧩',
      pages: '📄',
      services: '⚙️',
      hooks: '🪝',
      types: '📝',
      styles: '🎨',
      tests: '🧪',
      config: '⚙️',
      other: '📁'
    };
    return icons[category] || '📁';
  }

  isKnownCategory(file) {
    const patterns = [
      '/components/', '/pages/', '/services/', '/hooks/', '/types/',
      '.css', '.scss', '.test.', '.spec.', 'config', '.json'
    ];
    return patterns.some(pattern => file.includes(pattern));
  }

  gitAdd(files) {
    this.log('📝 Git add 実行中...');
    execSync(`git add ${files.join(' ')}`);
    this.log('✅ Git add 完了');
  }

  gitCommit(message) {
    this.log('💾 Git commit 実行中...');
    const tempFile = path.join(this.projectRoot, '.commit-message.tmp');
    fs.writeFileSync(tempFile, message);
    
    try {
      execSync(`git commit -F ${tempFile}`);
      this.log('✅ Git commit 完了');
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  gitPush() {
    this.log('🚀 Git push 実行中...');
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    execSync(`git push origin ${currentBranch}`);
    this.log('✅ Git push 完了');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    // ログファイルに記録
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  notifyError(error) {
    // エラー通知（Slack、メール等）
    this.log(`🚨 エラー通知: ${error.message}`);
    
    // 必要に応じて外部通知システムと連携
    // await this.sendSlackNotification(error);
    // await this.sendEmailNotification(error);
  }
}

// 実行
if (require.main === module) {
  const autoCommit = new AutoCommitSystem();
  autoCommit.execute().catch(console.error);
}

module.exports = AutoCommitSystem;
```

### **3. package.json スクリプト追加**

```json
{
  "scripts": {
    "auto-commit": "node scripts/auto-commit.js",
    "claude-commit": "node scripts/auto-commit.js"
  }
}
```

### **4. Claude Code への統合指示**

```markdown
# 各専門Claude への追加指示

## 🤖 自動コミット機能

作業完了時に以下を実行してください：

### 自動コミット条件
- 3つ以上のファイルを変更した場合
- 重要な機能実装が完了した場合
- タスクが完了した場合

### 実行コマンド
```bash
npm run auto-commit
```

### 実行タイミング
1. **タスク完了時**: 必ず実行
2. **大きな変更後**: コンポーネント作成、API実装等
3. **1時間以上の作業後**: 定期的なバックアップとして

### 失敗時の対応
- ビルドエラー: エラーを修正してから再実行
- テストエラー: テストを修正してから再実行
- 型エラー: 型定義を修正してから再実行
```

## 🔄 Kiro Agent Hooks の設定

### **Hook 作成手順**

1. **Kiro IDE でHook UI を開く**
   - Command Palette > "Open Kiro Hook UI"

2. **新しいHook を作成**
   ```json
   {
     "name": "Claude Auto Commit",
     "trigger": "file_change",
     "patterns": ["src/**/*.ts", "src/**/*.tsx"],
     "debounce": 30000,
     "action": "run_script",
     "script": "npm run auto-commit"
   }
   ```

3. **Hook の有効化**
   - Agent Hooks セクションで有効化

## 📊 監視・ログ機能

### **自動コミットログ**

```bash
# ログファイル: .kiro/logs/auto-commit.log
[2024-01-15T10:30:00.000Z] 🚀 自動コミットプロセス開始
[2024-01-15T10:30:05.000Z] 🔨 ビルドチェック実行中...
[2024-01-15T10:30:15.000Z] ✅ ビルド成功
[2024-01-15T10:30:16.000Z] 🧪 テスト実行中...
[2024-01-15T10:30:20.000Z] ✅ テスト成功
[2024-01-15T10:30:21.000Z] 📝 Git add 実行中...
[2024-01-15T10:30:22.000Z] ✅ Git add 完了
[2024-01-15T10:30:23.000Z] 💾 Git commit 実行中...
[2024-01-15T10:30:24.000Z] ✅ Git commit 完了
[2024-01-15T10:30:25.000Z] 🚀 Git push 実行中...
[2024-01-15T10:30:30.000Z] ✅ Git push 完了
[2024-01-15T10:30:30.000Z] ✅ 自動コミット完了
```

### **統計情報**

```markdown
## 📈 自動コミット統計

### 今日の実績
- 自動コミット回数: 8回
- 成功率: 100%
- 平均処理時間: 45秒
- 節約時間: 約20分

### 今週の実績
- 自動コミット回数: 45回
- 成功率: 96%
- エラー回数: 2回（型エラー1回、テストエラー1回）
- 節約時間: 約2.5時間
```

## 🎯 メリット

### **開発効率向上**
- 手動コミット作業の自動化
- 品質チェックの自動実行
- 一貫したコミットメッセージ

### **品質保証**
- ビルドエラーの事前検出
- テスト失敗の防止
- 型安全性の確保

### **チーム連携**
- リアルタイムな変更共有
- 詳細なコミット履歴
- 自動的なドキュメント更新

この自動コミットシステムにより、Claude Code チームが品質を保ちながら効率的に開発を進められます。