# 🎃 Cartwright Ranch Trick or Treat Map 🍬

An interactive web application that allows residents of Cartwright Ranch to mark their houses on a map if they're handing out candy on Halloween.

## Features

- **Interactive Neighborhood Map**: Uses a custom neighborhood image as the map background
- **Google Maps Integration**: Toggle between image view and actual Google Maps (optional)
- **Easy Marker Placement**: Click to mark your house location
- **Remove Markers**: Click on any marker to remove it
- **Shared Markers**: Optional Firebase integration for real-time marker sharing
- **Local Storage Fallback**: Works without configuration using browser storage
- **Zoom Controls**: Zoom in/out to view the map at different scales
- **Mobile Responsive**: Works on desktop and mobile devices
- **Halloween Theme**: Festive orange and purple color scheme

## Quick Start

1. **Add Your Neighborhood Map**: Replace `neighborhood-map.jpg` with a screenshot/image of your neighborhood
2. **Open the App**: Open `index.html` in any modern web browser
3. **Mark Houses**: Click "📍 Mark My House" then click on house locations
4. **Share**: Send the HTML file to neighbors, or optionally set up Firebase for real-time sharing

## Configuration (Optional)

### For Shared Markers (Firebase)
If you want markers to be shared across all users in real-time:

1. **Set up Firebase**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Realtime Database
   - Copy your config from Project Settings

2. **Add to config.js**:
   ```javascript
   window.CONFIG = {
       firebase: {
           apiKey: "your-api-key",
           authDomain: "your-project.firebaseapp.com",
           databaseURL: "https://your-project-rtdb.firebaseio.com",
           projectId: "your-project-id",
           // ... other config values
       }
   };
   ```

### For Google Maps Integration (Optional)
To enable satellite view toggle:

## Firebase Database Rules (If Using Firebase)
Set these rules in Firebase Console → Realtime Database → Rules:
```json
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
```

## Using Your Own Neighborhood Image

1. **Take a Screenshot**: Use Google Maps, satellite view, or any mapping service
2. **Save as Image**: Save as `neighborhood-map.jpg` (or .png, .jpeg, .gif)
3. **Replace the File**: Put it in the same folder as `index.html`
4. **Refresh**: Reload the page to see your custom map

## Troubleshooting

### Common Issues

**Map not loading:**
- Make sure `neighborhood-map.jpg` exists in the same folder as `index.html`
- Try different image formats (.png, .jpeg)
- Check browser console (F12) for error messages

**Markers not saving:**
- Without Firebase: markers save to your browser's localStorage (per device/browser)
- With Firebase: check that your config.js has valid Firebase credentials

**Firebase not working:**
- Verify Firebase Realtime Database rules allow read/write access
- Check browser console for Firebase initialization errors
- Ensure all Firebase config values are correct in `config.js`

**Google Maps not loading:**
- Ensure `googleMapsApiKey` is set in `config.js` (optional feature)
- Verify the API key has Maps JavaScript API enabled
- Check browser console for Maps API errors

**Markers not saving on GitHub Pages:**
- Without Firebase secrets: App uses localStorage (markers only visible to individual users)
- Check browser console (F12) for error messages
- Look for the deployment status panel in bottom-right corner of the page

**Google Maps not working:**
- Ensure `GOOGLE_MAPS_API_KEY` repository secret is set
- Check that your Google Maps API key has proper permissions
- Verify Maps JavaScript API is enabled in Google Cloud Console

**Image not showing:**
- Add `neighborhood-map.jpg` file to your repository root
- Supported formats: .jpg, .jpeg, .png, .gif
- If no image, app will show a helpful placeholder with instructions

**Local development issues:**
- Make sure `config.local.js` has your real Firebase config
- Check that `config.local.js` is in `.gitignore`
- Verify Firebase project allows your domain for local testing
6. Update the `GOOGLE_MAPS_CONFIG.center` in `app.js` with your neighborhood coordinates

See `config.example.js` for detailed configuration instructions.

## Deployment

### Local Development
Simply open `index.html` in a web browser, or run a local web server:

```bash
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000`

### GitHub Pages
1. Push the repository to GitHub
2. Go to Settings → Pages
3. Select the branch (e.g., `main`) and root directory
4. Save, and the site will be live at `https://[username].github.io/trickortreatmap`

### Other Static Hosting
The application consists of only three files with no external dependencies:
- `index.html` - Main HTML page
- `styles.css` - Styling
- `app.js` - JavaScript functionality

Upload these files to any static web host (Netlify, Vercel, etc.)

## Technical Details

- **Dependencies**: Firebase SDK for real-time data sync, Google Maps JavaScript API
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Storage**: Uses Firebase Realtime Database for shared markers (falls back to localStorage if not configured)
- **Responsive Design**: Adapts to different screen sizes
- **Real-time Sync**: All users see marker updates instantly when Firebase is configured

## Customization

To customize for a different neighborhood:
- Update the title in `index.html`
- Adjust colors in `styles.css`
- Update `GOOGLE_MAPS_CONFIG.center` in `app.js` with your neighborhood coordinates
- Modify the grid pattern or adjust the Google Maps zoom level

## Security Note

The provided Firebase configuration uses test mode rules for simplicity. For production use, implement proper security rules:
- Add authentication
- Restrict write access
- Validate data structure
- Add rate limiting

See Firebase documentation for security best practices.
