// Local Development Configuration Template
// Copy this file to config.local.js and replace the placeholder values with your actual Firebase credentials
// Then modify app.js to import from config.local.js when running locally
//
// IMPORTANT: Never commit config.local.js to your repository!
// Add config.local.js to your .gitignore file

// Firebase Configuration for Local Development
// Get these values from: https://console.firebase.google.com/
// 1. Create a new project or use an existing one
// 2. Go to Project Settings > General
// 3. Scroll down to "Your apps" and click on the web app icon
// 4. Copy the configuration values below
const FIREBASE_CONFIG_LOCAL = {
    apiKey: "YOUR_ACTUAL_FIREBASE_API_KEY",
    authDomain: "your-actual-project-id.firebaseapp.com",
    databaseURL: "https://your-actual-project-id-default-rtdb.firebaseio.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-actual-project-id.appspot.com",
    messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
    appId: "YOUR_ACTUAL_APP_ID"
};

// Google Maps Configuration for Local Development
// Get your API key from: https://console.cloud.google.com/
const GOOGLE_MAPS_API_KEY_LOCAL = "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY";

// Export for use in app.js (if using modules)
// You can modify app.js to check for local config first
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FIREBASE_CONFIG_LOCAL,
        GOOGLE_MAPS_API_KEY_LOCAL
    };
}