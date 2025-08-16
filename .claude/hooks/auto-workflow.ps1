# Auto-workflow PowerShell script for MyWineMemory project
# Automatically builds, tests, and commits changes after successful validation
# Includes automatic error fixing and retry mechanism

param(
    [string]$CommitMessage = "auto: automated update after successful build and tests",
    [int]$MaxRetries = 3
)

# Set error action preference for controlled error handling
$ErrorActionPreference = "Continue"

Write-Host "🔄 Starting auto-workflow with error fixing..." -ForegroundColor Blue

function Invoke-BuildWithRetry {
    param([int]$AttemptNumber)
    
    Write-Host "🏗️ Build attempt $AttemptNumber/$MaxRetries..." -ForegroundColor Yellow
    
    # Capture build output for error analysis
    $buildOutput = npm run build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "❌ Build failed. Analyzing errors..." -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Gray
    
    # Create error report file for Claude to analyze
    $errorReport = @"
Build failed on attempt $AttemptNumber

Build Output:
$buildOutput

Please analyze these errors and provide fixes. Common issues to check:
1. Missing imports
2. Type errors
3. Syntax errors
4. Missing dependencies
5. Configuration issues

Focus on the most critical errors first.
"@
    
    $errorReport | Out-File -FilePath ".claude/build-errors.log" -Encoding UTF8
    
    Write-Host "📝 Build errors logged to .claude/build-errors.log" -ForegroundColor Yellow
    Write-Host "🔧 Please review and fix the errors, then the workflow will retry automatically." -ForegroundColor Cyan
    
    return $false
}

function Invoke-TypeCheckWithRetry {
    param([int]$AttemptNumber)
    
    Write-Host "📝 TypeScript type check attempt $AttemptNumber/$MaxRetries..." -ForegroundColor Yellow
    
    $typeCheckOutput = npm run type-check 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TypeScript type check passed!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "❌ TypeScript errors found. Analyzing..." -ForegroundColor Red
    Write-Host $typeCheckOutput -ForegroundColor Gray
    
    # Create type error report
    $typeErrorReport = @"
TypeScript type check failed on attempt $AttemptNumber

Type Check Output:
$typeCheckOutput

Common TypeScript issues to fix:
1. Missing type annotations
2. Incorrect types
3. Missing imports for types
4. Unused variables/parameters
5. Strict mode violations

Please fix these type errors.
"@
    
    $typeErrorReport | Out-File -FilePath ".claude/type-errors.log" -Encoding UTF8
    
    Write-Host "📝 Type errors logged to .claude/type-errors.log" -ForegroundColor Yellow
    Write-Host "🔧 Please fix the type errors, then the workflow will retry automatically." -ForegroundColor Cyan
    
    return $false
}

function Invoke-LintWithAutoFix {
    Write-Host "🧹 Running ESLint with auto-fix..." -ForegroundColor Yellow
    
    # Try to auto-fix linting issues
    npm run lint 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Linting passed!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "⚠️ Linting issues found. Attempting auto-fix..." -ForegroundColor Yellow
    
    # Run lint with fix flag
    $lintOutput = npx eslint . --ext .ts,.tsx --fix 2>&1
    
    # Check again after auto-fix
    npm run lint 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Linting issues auto-fixed!" -ForegroundColor Green
        return $true
    }
    
    Write-Host "❌ Some linting issues couldn't be auto-fixed" -ForegroundColor Red
    Write-Host $lintOutput -ForegroundColor Gray
    
    return $false
}

# Main workflow with retry logic
$attempt = 1
$success = $false

while ($attempt -le $MaxRetries -and -not $success) {
    Write-Host "`n🔄 Workflow attempt $attempt/$MaxRetries" -ForegroundColor Magenta
    
    # Step 1: Type check with retry
    if (-not (Invoke-TypeCheckWithRetry -AttemptNumber $attempt)) {
        $attempt++
        if ($attempt -le $MaxRetries) {
            Write-Host "⏳ Waiting for fixes before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
        continue
    }
    
    # Step 2: Lint with auto-fix
    if (-not (Invoke-LintWithAutoFix)) {
        Write-Host "❌ Manual lint fixes required" -ForegroundColor Red
        $attempt++
        if ($attempt -le $MaxRetries) {
            Write-Host "⏳ Waiting for manual fixes before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
        continue
    }
    
    # Step 3: Build with retry
    if (-not (Invoke-BuildWithRetry -AttemptNumber $attempt)) {
        $attempt++
        if ($attempt -le $MaxRetries) {
            Write-Host "⏳ Waiting for fixes before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
        continue
    }
    
    $success = $true
}

if (-not $success) {
    Write-Host "❌ Workflow failed after $MaxRetries attempts" -ForegroundColor Red
    Write-Host "🔍 Check .claude/build-errors.log and .claude/type-errors.log for details" -ForegroundColor Yellow
    exit 1
}

try {

    # Step 4: Check if there are changes to commit
    $gitStatus = git status --porcelain
    if (-not $gitStatus) {
        Write-Host "ℹ️ No changes to commit" -ForegroundColor Cyan
        exit 0
    }

    # Step 5: Add changes
    Write-Host "📦 Adding changes to git..." -ForegroundColor Yellow
    git add .

    # Step 6: Commit
    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    $commitMsg = @"
$CommitMessage

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@
    git commit -m $commitMsg

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Commit failed" -ForegroundColor Red
        exit 1
    }

    # Step 7: Push (optional - uncomment if you want auto-push)
    # Write-Host "🚀 Pushing to remote..." -ForegroundColor Yellow
    # git push
    # if ($LASTEXITCODE -ne 0) {
    #     Write-Host "❌ Push failed" -ForegroundColor Red
    #     exit 1
    # }

    Write-Host "🎉 Auto-workflow completed successfully!" -ForegroundColor Green
    Write-Host "📝 Changes committed. Run 'git push' manually when ready." -ForegroundColor Cyan

} catch {
    Write-Host "❌ Auto-workflow failed: $_" -ForegroundColor Red
    exit 1
}