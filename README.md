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

### Full Setup (Shared Markers + Google Maps)

To enable shared markers and Google Maps integration:

#### 1. Firebase Setup (for shared markers)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Go to **Build** → **Realtime Database** → **Create Database**
4. Start in **test mode** (or configure rules as shown in `config.example.js`)
5. Copy your configuration from **Project Settings** → **General** → **Your apps**
6. Update the `FIREBASE_CONFIG` object in `app.js` with your values

#### 2. Google Maps Setup (for map view)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or use an existing one
3. Enable **Maps JavaScript API**
4. Create an **API Key** under **Credentials**
5. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `index.html` with your API key
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
