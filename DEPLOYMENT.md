# MyWineMemoryV3 Deployment Guide

## 📋 Overview

This guide covers the complete deployment process for MyWineMemoryV3, including staging and production environments.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │───▶│     Staging     │───▶│   Production    │
│   (localhost)   │    │   (Firebase)    │    │   (Firebase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Prerequisites

### Required Tools
- Node.js 18+ 
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run `firebase login` to authenticate

## 🔧 Environment Configuration

### Environment Variables

Create `.env` files for each environment:

#### `.env.staging`
```bash
VITE_ENVIRONMENT=staging
VITE_FIREBASE_PROJECT_ID=mywinememoryv3-staging
VITE_FIREBASE_API_KEY=your_staging_api_key
# ... other staging configs
```

#### `.env.production`
```bash
VITE_ENVIRONMENT=production
VITE_FIREBASE_PROJECT_ID=mywinememoryv3
VITE_FIREBASE_API_KEY=your_production_api_key
# ... other production configs
```

### Firebase Projects

```bash
# Set up Firebase projects
firebase projects:create mywinememoryv3-staging
firebase projects:create mywinememoryv3

# Configure project aliases
firebase use --add mywinememoryv3-staging --alias staging
firebase use --add mywinememoryv3 --alias production
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

#### Deploy to Staging
```bash
npm run deploy:staging
```

#### Deploy to Production
```bash
npm run deploy:production
```

#### Full Deployment with All Checks
```bash
npm run deploy
```

### Method 2: Manual Deployment

#### Build the Application
```bash
npm run build
```

#### Deploy to Firebase
```bash
# Staging
firebase use staging
firebase deploy --only hosting

# Production
firebase use production
firebase deploy
```

### Method 3: CI/CD Pipeline

The GitHub Actions workflow automatically deploys:
- `develop` branch → Staging
- `main` branch → Production

## 🔍 Health Checks

### Run Health Checks

```bash
# Check production
npm run health-check

# Check staging
npm run health-check:staging

# Check all environments
npm run health-check:all
```

### Health Check Components
- ✅ Connectivity test
- ✅ SPA routing verification
- ✅ Static asset loading
- ✅ Performance benchmarks
- ✅ Content validation

## 📊 Monitoring & Analytics

### Performance Monitoring
- **Lighthouse CI**: Automated performance testing
- **Sentry**: Error tracking and performance monitoring
- **Firebase Performance**: Real-time performance metrics

### Key Metrics to Monitor
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Error rates < 1%
- Uptime > 99.9%

## 🔐 Security Considerations

### Firebase Security Rules

#### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Wine records are private to users
    match /wineRecords/{recordId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Content Security Policy

Add to your hosting headers:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'"
}
```

## 🧪 Testing Strategy

### Pre-deployment Testing

1. **Unit Tests**
   ```bash
   npm run test
   ```

2. **Type Checking**
   ```bash
   npm run type-check
   ```

3. **Linting**
   ```bash
   npm run lint
   ```

4. **E2E Tests**
   ```bash
   npm run test:e2e
   ```

5. **Performance Tests**
   ```bash
   npm run test:e2e -- performance.spec.ts
   ```

### Post-deployment Testing

1. **Health Checks**
   ```bash
   npm run health-check:all
   ```

2. **Manual Smoke Tests**
   - User registration/login
   - Wine record creation
   - Image upload
   - Search functionality
   - Subscription management

## 🔄 Rollback Procedures

### Immediate Rollback

```bash
# Rollback to previous version
firebase hosting:clone mywinememoryv3:PREVIOUS_VERSION mywinememoryv3:live

# Or redeploy previous version
git checkout <previous-commit>
npm run deploy:production
```

### Database Rollback

```bash
# Firestore rules rollback
firebase deploy --only firestore:rules --project production

# Note: Data rollback requires backup restoration
```

## 📈 Scaling Considerations

### Performance Optimization
- **Code Splitting**: Implemented via Vite
- **Image Optimization**: WebP format with fallbacks
- **Caching Strategy**: Service worker + Firebase hosting cache headers
- **CDN**: Firebase hosting global CDN

### Cost Optimization
- **Firebase Blaze Plan**: Pay-as-you-go pricing
- **Resource Monitoring**: Set up billing alerts
- **Quota Management**: Monitor API usage limits

## 🔧 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### Deployment Failures
```bash
# Check Firebase authentication
firebase login:list

# Verify project configuration
firebase projects:list
```

#### Performance Issues
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist/

# Check lighthouse scores
npm run test:e2e -- performance.spec.ts
```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=firebase*
firebase deploy --debug
```

## 📚 Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Vite Production Guide](https://vitejs.dev/guide/build.html)
- [React Deployment Best Practices](https://create-react-app.dev/docs/deployment/)
- [Web Performance Best Practices](https://web.dev/fast/)

## 🆘 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Firebase console for errors
4. Contact the development team

---

**Last Updated:** January 2025
**Version:** 1.0.0