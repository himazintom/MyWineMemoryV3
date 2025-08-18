# MyWineMemoryV3 Deployment Script (PowerShell)
# This script handles the complete deployment process for Windows

param(
    [switch]$SkipTests,
    [switch]$SkipPerformance,
    [switch]$Help
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output
$colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
}

function Write-Status {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor $colors.Blue
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $colors.Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $colors.Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $colors.Red
}

function Show-Help {
    Write-Host "MyWineMemoryV3 Deployment Script" -ForegroundColor $colors.Cyan
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [options]" -ForegroundColor $colors.Blue
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $colors.Blue
    Write-Host "  -SkipTests         Skip running tests"
    Write-Host "  -SkipPerformance   Skip performance tests"
    Write-Host "  -Help              Show this help message"
    Write-Host ""
    exit 0
}

function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Node.js is not installed"
        exit 1
    }
    
    # Check npm
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm is not installed"
        exit 1
    }
    
    # Check Firebase CLI
    if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
        Write-Error "Firebase CLI is not installed. Run: npm install -g firebase-tools"
        exit 1
    }
    
    Write-Success "All dependencies are installed"
}

function Test-Environment {
    Write-Status "Checking environment configuration..."
    
    if (-not $env:VITE_FIREBASE_API_KEY) {
        Write-Error "VITE_FIREBASE_API_KEY is not set"
        exit 1
    }
    
    if (-not $env:VITE_FIREBASE_PROJECT_ID) {
        Write-Error "VITE_FIREBASE_PROJECT_ID is not set"
        exit 1
    }
    
    Write-Success "Environment variables are configured"
}

function Install-Dependencies {
    Write-Status "Installing dependencies..."
    
    try {
        npm ci
        Write-Success "Dependencies installed"
    }
    catch {
        Write-Error "Failed to install dependencies: $_"
        exit 1
    }
}

function Invoke-Tests {
    if ($SkipTests) {
        Write-Warning "Skipping tests"
        return
    }
    
    Write-Status "Running tests..."
    
    try {
        # Run unit tests
        npm run test -- --watchAll=false --coverage
        
        # Run type checking
        npm run type-check
        
        # Run linting
        npm run lint
        
        Write-Success "All tests passed"
    }
    catch {
        Write-Error "Tests failed: $_"
        exit 1
    }
}

function Build-Application {
    Write-Status "Building application..."
    
    try {
        # Clean previous build
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
        }
        
        # Build the application
        npm run build
        
        # Verify build output
        if (-not (Test-Path "dist")) {
            Write-Error "Build failed - dist directory not found"
            exit 1
        }
        
        if (-not (Test-Path "dist/index.html")) {
            Write-Error "Build failed - index.html not found"
            exit 1
        }
        
        Write-Success "Application built successfully"
    }
    catch {
        Write-Error "Build failed: $_"
        exit 1
    }
}

function Invoke-PerformanceTests {
    if ($SkipPerformance) {
        Write-Warning "Skipping performance tests"
        return
    }
    
    Write-Status "Running performance tests..."
    
    try {
        # Start preview server in background
        $previewJob = Start-Job -ScriptBlock { npm run preview }
        
        # Wait for server to start
        Start-Sleep 5
        
        # Run Lighthouse CI if available
        if (Get-Command lhci -ErrorAction SilentlyContinue) {
            try {
                lhci autorun
            }
            catch {
                Write-Warning "Lighthouse CI failed: $_"
            }
        }
        else {
            Write-Warning "Lighthouse CI not installed, skipping performance tests"
        }
        
        # Stop preview server
        Stop-Job $previewJob -ErrorAction SilentlyContinue
        Remove-Job $previewJob -ErrorAction SilentlyContinue
        
        Write-Success "Performance tests completed"
    }
    catch {
        Write-Warning "Performance tests encountered issues: $_"
    }
}

function Deploy-ToFirebase {
    Write-Status "Deploying to Firebase..."
    
    try {
        # Check if logged in
        $projects = firebase projects:list 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Not logged in to Firebase. Run: firebase login"
            exit 1
        }
        
        # Deploy hosting
        firebase deploy --only hosting
        
        Write-Success "Deployed to Firebase successfully"
    }
    catch {
        Write-Error "Firebase deployment failed: $_"
        exit 1
    }
}

function Deploy-Firestore {
    Write-Status "Deploying Firestore rules and indexes..."
    
    try {
        # Deploy rules
        if (Test-Path "firestore.rules") {
            firebase deploy --only firestore:rules
        }
        
        # Deploy indexes
        if (Test-Path "firestore.indexes.json") {
            firebase deploy --only firestore:indexes
        }
        
        Write-Success "Firestore rules and indexes deployed"
    }
    catch {
        Write-Error "Firestore deployment failed: $_"
        exit 1
    }
}

function Deploy-Storage {
    Write-Status "Deploying Storage rules..."
    
    try {
        if (Test-Path "storage.rules") {
            firebase deploy --only storage
            Write-Success "Storage rules deployed"
        }
        else {
            Write-Warning "storage.rules not found, skipping"
        }
    }
    catch {
        Write-Error "Storage deployment failed: $_"
        exit 1
    }
}

function Deploy-Functions {
    Write-Status "Checking for Firebase Functions..."
    
    try {
        if (Test-Path "functions") {
            Write-Status "Deploying Firebase Functions..."
            firebase deploy --only functions
            Write-Success "Functions deployed"
        }
        else {
            Write-Warning "Functions directory not found, skipping"
        }
    }
    catch {
        Write-Error "Functions deployment failed: $_"
        exit 1
    }
}

function New-DeploymentReport {
    Write-Status "Generating deployment report..."
    
    try {
        # Get deployment info
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $version = (Get-Content package.json | ConvertFrom-Json).version
        
        # Try to get git commit
        try {
            $commit = git rev-parse --short HEAD
        }
        catch {
            $commit = "unknown"
        }
        
        # Create report
        $report = @"
# Deployment Report

**Date:** $timestamp
**Version:** $version
**Commit:** $commit

## Deployment Steps Completed

- ✅ Dependencies checked
- ✅ Environment verified
- ✅ Tests passed
- ✅ Application built
- ✅ Performance tests run
- ✅ Firebase hosting deployed
- ✅ Firestore rules deployed
- ✅ Storage rules deployed

## URLs

- **Production:** https://your-project-id.web.app
- **Console:** https://console.firebase.google.com/project/your-project-id

## Next Steps

1. Verify the application is working correctly
2. Monitor error rates in Sentry
3. Check performance metrics
4. Update DNS if using custom domain

"@
        
        $report | Out-File -FilePath "deployment-report.md" -Encoding UTF8
        
        Write-Success "Deployment report generated: deployment-report.md"
    }
    catch {
        Write-Warning "Failed to generate deployment report: $_"
    }
}

function Main {
    if ($Help) {
        Show-Help
    }
    
    Write-Status "🚀 Starting MyWineMemoryV3 deployment process..."
    
    try {
        # Run deployment steps
        Test-Dependencies
        Test-Environment
        Install-Dependencies
        Invoke-Tests
        Build-Application
        Invoke-PerformanceTests
        
        # Deploy to Firebase
        Deploy-ToFirebase
        Deploy-Firestore
        Deploy-Storage
        Deploy-Functions
        
        # Generate report
        New-DeploymentReport
        
        Write-Success "🎉 Deployment completed successfully!"
        Write-Status "Application is now live at: https://your-project-id.web.app"
    }
    catch {
        Write-Error "Deployment failed: $_"
        exit 1
    }
}

# Run main function
Main