# Error analyzer script for automatic error fixing
# This script helps Claude Code understand and fix common build/type errors

param(
    [string]$ErrorLogPath,
    [string]$ErrorType = "build"
)

function Get-CommonFixes {
    param([string]$ErrorOutput, [string]$Type)
    
    $fixes = @()
    
    if ($Type -eq "build" -or $Type -eq "typescript") {
        # TypeScript/Build error patterns and fixes
        if ($ErrorOutput -match "Cannot find module '([^']+)'") {
            $missingModule = $Matches[1]
            $fixes += @{
                Issue = "Missing module: $missingModule"
                Fix = "Add import statement or install missing dependency"
                Suggestion = "import ... from '$missingModule' or npm install $missingModule"
            }
        }
        
        if ($ErrorOutput -match "Property '([^']+)' does not exist on type '([^']+)'") {
            $property = $Matches[1]
            $type = $Matches[2]
            $fixes += @{
                Issue = "Property '$property' not found on type '$type'"
                Fix = "Add property to interface or use optional chaining"
                Suggestion = "Add '$property?: any' to interface or use 'obj.$property?'"
            }
        }
        
        if ($ErrorOutput -match "Type '([^']+)' is not assignable to type '([^']+)'") {
            $fromType = $Matches[1]
            $toType = $Matches[2]
            $fixes += @{
                Issue = "Type mismatch: '$fromType' → '$toType'"
                Fix = "Add type assertion or fix type definition"
                Suggestion = "Use 'as $toType' or update type definition"
            }
        }
        
        if ($ErrorOutput -match "Argument of type '([^']+)' is not assignable to parameter of type '([^']+)'") {
            $argType = $Matches[1]
            $paramType = $Matches[2]
            $fixes += @{
                Issue = "Parameter type mismatch: '$argType' → '$paramType'"
                Fix = "Convert argument type or update function signature"
                Suggestion = "Cast argument or update function parameter type"
            }
        }
        
        if ($ErrorOutput -match "'([^']+)' is declared but its value is never read") {
            $variable = $Matches[1]
            $fixes += @{
                Issue = "Unused variable: '$variable'"
                Fix = "Remove variable or prefix with underscore"
                Suggestion = "Delete '$variable' or rename to '_$variable'"
            }
        }
    }
    
    if ($Type -eq "lint") {
        # ESLint error patterns and fixes
        if ($ErrorOutput -match "Missing semicolon") {
            $fixes += @{
                Issue = "Missing semicolon"
                Fix = "Add semicolon at end of statement"
                Suggestion = "Most ESLint issues can be auto-fixed with --fix flag"
            }
        }
        
        if ($ErrorOutput -match "Prefer const assertion") {
            $fixes += @{
                Issue = "Should use const assertion"
                Fix = "Use 'as const' for immutable values"
                Suggestion = "Add 'as const' to the end of the expression"
            }
        }
    }
    
    return $fixes
}

function Write-ErrorAnalysis {
    param([string]$LogPath, [string]$Type)
    
    if (-not (Test-Path $LogPath)) {
        Write-Host "❌ Error log not found: $LogPath" -ForegroundColor Red
        return
    }
    
    $errorContent = Get-Content $LogPath -Raw
    $fixes = Get-CommonFixes -ErrorOutput $errorContent -Type $Type
    
    $analysisReport = @"
# Error Analysis Report - $(Get-Date)

## Error Type: $Type

## Original Error Log:
```
$errorContent
```

## Suggested Fixes:

"@
    
    foreach ($fix in $fixes) {
        $analysisReport += @"

### ❌ Issue: $($fix.Issue)
**Fix:** $($fix.Fix)
**Suggestion:** $($fix.Suggestion)

"@
    }
    
    if ($fixes.Count -eq 0) {
        $analysisReport += @"

### ⚠️ No automatic fixes detected
Please manually review the errors above and fix them.

Common debugging steps:
1. Check for typos in variable/function names
2. Verify all imports are correct
3. Check if all dependencies are installed
4. Ensure all required properties are defined
5. Review type definitions and interfaces

"@
    }
    
    $analysisPath = $LogPath.Replace(".log", "-analysis.md")
    $analysisReport | Out-File -FilePath $analysisPath -Encoding UTF8
    
    Write-Host "📋 Error analysis saved to: $analysisPath" -ForegroundColor Cyan
}

# Main execution
if ($ErrorLogPath) {
    Write-ErrorAnalysis -LogPath $ErrorLogPath -Type $ErrorType
} else {
    Write-Host "Usage: .\error-analyzer.ps1 -ErrorLogPath <path> -ErrorType <build|typescript|lint>" -ForegroundColor Yellow
}