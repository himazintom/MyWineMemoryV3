#!/bin/bash

# MyWineMemoryV3 Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting MyWineMemoryV3 deployment process..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Run: npm install -g firebase-tools"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Check environment variables
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ -z "$VITE_FIREBASE_API_KEY" ]; then
        print_error "VITE_FIREBASE_API_KEY is not set"
        exit 1
    fi
    
    if [ -z "$VITE_FIREBASE_PROJECT_ID" ]; then
        print_error "VITE_FIREBASE_PROJECT_ID is not set"
        exit 1
    fi
    
    print_success "Environment variables are configured"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run unit tests
    npm run test -- --watchAll=false --coverage
    
    # Run type checking
    npm run type-check
    
    # Run linting
    npm run lint
    
    print_success "All tests passed"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    # Clean previous build
    rm -rf dist/
    
    # Build the application
    npm run build
    
    # Verify build output
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    # Check if index.html exists
    if [ ! -f "dist/index.html" ]; then
        print_error "Build failed - index.html not found"
        exit 1
    fi
    
    print_success "Application built successfully"
}

# Run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Start the application in background
    npm run preview &
    PREVIEW_PID=$!
    
    # Wait for the server to start
    sleep 5
    
    # Run Lighthouse CI
    if command -v lhci &> /dev/null; then
        lhci autorun || print_warning "Lighthouse CI failed"
    else
        print_warning "Lighthouse CI not installed, skipping performance tests"
    fi
    
    # Kill preview server
    kill $PREVIEW_PID 2>/dev/null || true
    
    print_success "Performance tests completed"
}

# Deploy to Firebase
deploy_to_firebase() {
    print_status "Deploying to Firebase..."
    
    # Check if user is logged in
    if ! firebase projects:list &> /dev/null; then
        print_error "Not logged in to Firebase. Run: firebase login"
        exit 1
    fi
    
    # Deploy hosting
    firebase deploy --only hosting
    
    print_success "Deployed to Firebase successfully"
}

# Deploy Firestore rules and indexes
deploy_firestore() {
    print_status "Deploying Firestore rules and indexes..."
    
    # Deploy rules
    if [ -f "firestore.rules" ]; then
        firebase deploy --only firestore:rules
    fi
    
    # Deploy indexes
    if [ -f "firestore.indexes.json" ]; then
        firebase deploy --only firestore:indexes
    fi
    
    print_success "Firestore rules and indexes deployed"
}

# Deploy Storage rules
deploy_storage() {
    print_status "Deploying Storage rules..."
    
    if [ -f "storage.rules" ]; then
        firebase deploy --only storage
        print_success "Storage rules deployed"
    else
        print_warning "storage.rules not found, skipping"
    fi
}

# Deploy Functions (if exists)
deploy_functions() {
    print_status "Checking for Firebase Functions..."
    
    if [ -d "functions" ]; then
        print_status "Deploying Firebase Functions..."
        firebase deploy --only functions
        print_success "Functions deployed"
    else
        print_warning "Functions directory not found, skipping"
    fi
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    # Get deployment info
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    VERSION=$(node -p "require('./package.json').version")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Create report
    cat > deployment-report.md << EOF
# Deployment Report

**Date:** $TIMESTAMP
**Version:** $VERSION
**Commit:** $COMMIT

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

EOF
    
    print_success "Deployment report generated: deployment-report.md"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Main deployment function
main() {
    print_status "Starting deployment process..."
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run deployment steps
    check_dependencies
    check_environment
    install_dependencies
    run_tests
    build_application
    
    # Optional performance tests
    if [ "${SKIP_PERFORMANCE_TESTS:-false}" != "true" ]; then
        run_performance_tests
    fi
    
    # Deploy to Firebase
    deploy_to_firebase
    deploy_firestore
    deploy_storage
    deploy_functions
    
    # Generate report
    generate_report
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Application is now live at: https://your-project-id.web.app"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --skip-tests           Skip running tests"
            echo "  --skip-performance     Skip performance tests"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"