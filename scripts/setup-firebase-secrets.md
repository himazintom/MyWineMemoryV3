# Firebase Secrets Setup Guide

This project requires Firebase service account credentials for GitHub Actions deployment.

## Required GitHub Secrets

You need to set the following secret in your GitHub repository:

### `FIREBASE_SERVICE_ACCOUNT_MYWINEMEMORYV3`
- This should contain the full JSON content of your Firebase service account key
- Get this from Firebase Console > Project Settings > Service Accounts > Generate new private key

## Steps to Set Up:

1. **Get Firebase Service Account Key:**
   ```bash
   # Option 1: Download from Firebase Console
   # Go to: https://console.firebase.google.com/project/mywinememoryv3/settings/serviceaccounts/adminsdk
   # Click "Generate new private key" and download the JSON file
   
   # Option 2: Use Firebase CLI
   firebase login
   firebase projects:list
   # Use the Firebase CLI to generate service account key if needed
   ```

2. **Add to GitHub Secrets:**
   ```bash
   # Go to your GitHub repository
   # Settings > Secrets and variables > Actions
   # Click "New repository secret"
   # Name: FIREBASE_SERVICE_ACCOUNT_MYWINEMEMORYV3
   # Value: [Paste the entire JSON content of the service account key file]
   ```

3. **Verify Other Required Secrets:**
   The following secrets should also be set (get values from your `.env` file):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

## Optional Secrets:
- `SLACK_WEBHOOK_URL` - Only needed if you want Slack notifications (now optional)
- `CODECOV_TOKEN` - Only needed for code coverage reports
- `SNYK_TOKEN` - Only needed for security scanning

## Testing the Setup:
After setting up the secrets, push a commit to the `main` branch to trigger the deployment workflow and verify everything works.