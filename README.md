# 🎃 Cartwright Ranch Trick or Treat Map 🍬

An interactive web application that allows residents of Cartwright Ranch to mark their houses on a map if they're handing out candy on Halloween.

## Features

- **Interactive Map Grid**: Visual neighborhood grid with street lines
- **Easy Marker Placement**: Click to mark your house location
- **Remove Markers**: Click on any marker to remove it
- **Zoom Controls**: Zoom in/out to view the map at different scales
- **Local Storage**: Markers persist in your browser
- **Mobile Responsive**: Works on desktop and mobile devices
- **Halloween Theme**: Festive orange and purple color scheme

## How to Use

1. Open `index.html` in any modern web browser
2. Click the "📍 Mark My House" button to enable marking mode
3. Click on your house location on the map grid
4. Your house will be marked with a 🎃 pumpkin icon
5. To remove a marker, simply click on it and confirm removal
6. Use the zoom buttons (🔍 + and 🔍 -) to adjust the view

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

- **No External Dependencies**: Self-contained, no CDN or library requirements
- **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- **Storage**: Uses localStorage to persist markers
- **Responsive Design**: Adapts to different screen sizes

## Customization

To customize for a different neighborhood:
- Update the title in `index.html`
- Adjust colors in `styles.css`
- Modify the grid pattern or add a background map image

## Browser Storage Note

Markers are stored locally in each user's browser. For a shared community map, consider adding a backend service to store markers centrally.
