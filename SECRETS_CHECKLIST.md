# GitHub Repository Secrets Checklist

## Required Firebase Secrets (for real-time sharing)
Go to your GitHub repository → Settings → Secrets and variables → Actions

Make sure you have these EXACT secret names:

### Firebase Configuration:
- [ ] `FIREBASE_API_KEY` - Your Firebase API key 
- [ ] `FIREBASE_AUTH_DOMAIN` - Usually: `your-project-id.firebaseapp.com`
- [ ] `FIREBASE_DATABASE_URL` - Your Realtime Database URL
- [ ] `FIREBASE_PROJECT_ID` - Your Firebase project ID
- [ ] `FIREBASE_STORAGE_BUCKET` - Usually: `your-project-id.appspot.com` 
- [ ] `FIREBASE_MESSAGING_SENDER_ID` - Your messaging sender ID
- [ ] `FIREBASE_APP_ID` - Your Firebase app ID

### Optional Google Maps Secret:
- [ ] `GOOGLE_MAPS_API_KEY` - Your Google Maps JavaScript API key

## How to Get Firebase Values:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Go to Project Settings (gear icon) → General tab
4. Scroll to "Your apps" section
5. Click on the web app or create one
6. Copy the config values and add them to GitHub secrets

## Example Firebase Config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxx...",              // → FIREBASE_API_KEY
  authDomain: "myproject.firebaseapp.com", // → FIREBASE_AUTH_DOMAIN  
  databaseURL: "https://myproject-default-rtdb.firebaseio.com/", // → FIREBASE_DATABASE_URL
  projectId: "myproject",                  // → FIREBASE_PROJECT_ID
  storageBucket: "myproject.appspot.com",  // → FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789012",       // → FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789012:web:abcdef123456" // → FIREBASE_APP_ID
};
```

## Troubleshooting:
- Secret names must match EXACTLY (case-sensitive)
- No extra spaces in secret names
- Values should not have quotes around them
- After adding secrets, push any commit to trigger redeployment