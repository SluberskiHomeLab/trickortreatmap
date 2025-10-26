// Configuration Example
// Copy this file to app.js and replace the configuration values with your own

// Firebase Configuration
// Get these values from: https://console.firebase.google.com/
// 1. Create a new project or use an existing one
// 2. Go to Project Settings > General
// 3. Scroll down to "Your apps" and click on the web app icon
// 4. Copy the configuration values
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Google Maps Configuration
// Get your API key from: https://console.cloud.google.com/
// 1. Create a new project or use an existing one
// 2. Enable the Maps JavaScript API
// 3. Create credentials (API Key)
// 4. Copy your API key and replace YOUR_GOOGLE_MAPS_API_KEY in index.html
//
// Update the center coordinates to your neighborhood location
const GOOGLE_MAPS_CONFIG = {
    center: { lat: 33.6846, lng: -117.8265 }, // Update with your coordinates
    zoom: 16 // Adjust zoom level as needed
};

// Firebase Realtime Database Rules
// Set these rules in Firebase Console > Realtime Database > Rules:
/*
{
  "rules": {
    "markers": {
      ".read": true,
      ".write": true,
      "$markerId": {
        ".validate": "newData.hasChildren(['id', 'timestamp'])"
      }
    }
  }
}
*/
