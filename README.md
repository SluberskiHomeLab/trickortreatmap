# 🎃 Cartwright Ranch Trick or Treat Map 🍬

An interactive web application that allows residents of Cartwright Ranch to mark their houses on a map if they're handing out candy on Halloween.

## Features

- **Interactive Map Grid**: Visual neighborhood grid with street lines
- **Google Maps Integration**: Toggle between grid view and actual Google Maps
- **Easy Marker Placement**: Click to mark your house location
- **Remove Markers**: Click on any marker to remove it
- **Shared Markers**: Markers are synchronized across all users in real-time using Firebase
- **Zoom Controls**: Zoom in/out to view the map at different scales
- **Mobile Responsive**: Works on desktop and mobile devices
- **Halloween Theme**: Festive orange and purple color scheme

## How to Use

1. Open `index.html` in any modern web browser
2. Click the "📍 Mark My House" button to enable marking mode
3. Click on your house location on the map grid (or Google Maps if configured)
4. Your house will be marked with a 🎃 pumpkin icon
5. To remove a marker, simply click on it and confirm removal
6. Use the zoom buttons (🔍 + and 🔍 -) to adjust the view
7. Click "🗺️ Toggle Map View" to switch between grid and Google Maps (requires setup)

## Setup and Configuration

### Quick Start (No Configuration)
Simply open `index.html` in a web browser. The app will work with:
- Grid-based map view
- Local storage (markers visible only to you)

### GitHub Pages Deployment with Secure Configuration

This project is designed to be deployed to GitHub Pages using GitHub Actions with secure repository secrets. This keeps your Firebase and Google Maps API keys private.

#### 1. Fork/Clone this Repository
1. Fork this repository to your GitHub account
2. Clone it to your local machine for development

#### 2. Set Up Firebase (for shared markers)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Go to **Build** → **Realtime Database** → **Create Database**
4. Start in **test mode** (or configure rules as shown below)
5. Copy your configuration from **Project Settings** → **General** → **Your apps**

#### 3. Set Up Google Maps API (optional, for map view)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Enable **Maps JavaScript API**
4. Create an **API Key** under **Credentials**

#### 4. Configure GitHub Repository Secrets
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add the following repository secrets:

**Required Firebase Secrets:**
- `FIREBASE_API_KEY`: Your Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Your project's auth domain (usually `projectid.firebaseapp.com`)
- `FIREBASE_DATABASE_URL`: Your Realtime Database URL
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Your storage bucket (usually `projectid.appspot.com`)
- `FIREBASE_MESSAGING_SENDER_ID`: Your messaging sender ID
- `FIREBASE_APP_ID`: Your Firebase app ID

**Optional Google Maps Secret:**
- `GOOGLE_MAPS_API_KEY`: Your Google Maps API key (if using map view)

#### 5. Enable GitHub Pages
1. Go to your repository → **Settings** → **Pages**
2. Set **Source** to "GitHub Actions"
3. The site will automatically deploy when you push to the main branch

#### 6. Firebase Database Rules
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

### Local Development

#### Option 1: Using the deployed version
Simply use your deployed GitHub Pages URL for testing.

#### Option 2: Local development with Firebase
1. Copy `config.local.template.js` to `config.local.js`
2. Replace placeholder values with your actual Firebase configuration
3. Modify `app.js` to use local config when developing locally
4. **Never commit `config.local.js` to your repository!**

### Security Notes
- **Never commit real API keys or Firebase config to your repository**
- All sensitive configuration is handled through GitHub repository secrets
- The deployed version gets the real config injected during the GitHub Actions build process
- Local development uses separate local config files that are ignored by git

## Deployment Process

### Automatic Deployment
Once you've set up the GitHub repository secrets:

1. **Push to main branch**: Any push to the `main` branch triggers deployment
2. **GitHub Actions builds**: The workflow replaces placeholder config with real secrets
3. **Deploy to GitHub Pages**: The built site is automatically deployed
4. **Access your site**: Visit `https://yourusername.github.io/trickortreatmap`

### Monitoring Deployments
- Check the **Actions** tab in your GitHub repository to monitor deployment status
- If deployment fails, check the action logs for error details
- Common issues: missing repository secrets or incorrect secret names

### Manual Deployment Testing
You can test the deployment process locally:
```bash
# Clone your repo
git clone https://github.com/yourusername/trickortreatmap.git
cd trickortreatmap

# Test the build process (requires your actual config values)
# This simulates what GitHub Actions does
sed -i 's/PLACEHOLDER_FIREBASE_API_KEY/your-actual-api-key/g' app.js
# ... (replace other placeholders)

# Open index.html to test
```

## Troubleshooting

### Common Issues

**Firebase not working:**
- Check that all Firebase secrets are set correctly in GitHub repository settings
- Verify Firebase Realtime Database rules allow read/write access
- Check browser console for Firebase initialization errors

**Google Maps not loading:**
- Ensure `GOOGLE_MAPS_API_KEY` secret is set (optional feature)
- Verify the API key has Maps JavaScript API enabled
- Check browser console for Maps API errors

**GitHub Pages deployment fails:**
- Verify repository secrets are named exactly as specified
- Check Actions tab for detailed error logs
- Ensure GitHub Pages is enabled in repository settings

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
