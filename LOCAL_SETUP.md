# Local SQLite Setup Guide

This guide will help you set up the Trick or Treat Map with a local SQLite database and Node.js server - no cloud dependencies required!

## Prerequisites

- **Node.js** (v16 or later): [Download here](https://nodejs.org/)
- **NPM** (comes with Node.js)
- A modern web browser

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Database

```bash
npm run init-db
```

This creates a local SQLite database (`trickortreat.db`) with the required tables.

### 3. Start the Server

```bash
npm start
```

You should see:
```
🎃 Trick or Treat Map Server Started!
🌐 Server running on http://localhost:3001
```

### 4. Open the App

Open your web browser and go to:
- **http://localhost:3001** (served by the Node.js server)
- Or double-click `index.html` (the app will connect to the local API)

## Features

### ✅ **Local-Only Operation**
- No cloud services required
- All data stays on your computer
- Works completely offline
- Perfect for neighborhood use

### ✅ **Real-Time Shared Markers**
- Multiple people can connect to your local server
- Markers sync in real-time across all connected devices
- 10-second auto-refresh (faster than cloud services)

### ✅ **Built-in Security**
- Rate limiting: 20 requests per minute per IP
- CORS protection for local network only
- Input validation and sanitization
- SQL injection protection

### ✅ **Persistent Storage**
- SQLite database stores all markers
- Survives server restarts
- Easy to backup (just copy `trickortreat.db`)

## Configuration

### Database Settings

Edit `init-db.js` to change default settings:

```javascript
// Default settings in the database
'max_markers': '100',           // Maximum markers allowed
'rate_limit_per_minute': '10',  // API rate limit
'map_center_lat': '33.6846',    // Default map center
'map_center_lng': '-117.8265'   // Default map center
```

### Server Settings

Edit `server.js` to customize:

```javascript
const PORT = process.env.PORT || 3001;  // Change server port

// CORS settings - add your local network IPs
origin: ['http://localhost:3000', 'http://192.168.1.100:3000']
```

### Frontend Settings

Edit `config.js` to adjust sync frequency:

```javascript
storage: {
    syncInterval: 5000  // Sync every 5 seconds (faster updates)
}
```

## Network Sharing

To share with other devices on your local network:

### 1. Find Your IP Address

**Windows:**
```bash
ipconfig
```

**Mac/Linux:**
```bash
ifconfig
```

Look for your local IP (usually starts with `192.168.` or `10.`)

### 2. Update CORS Settings

Edit `server.js` and add your IP to the CORS origins:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3001',
        'http://192.168.1.100:3001',  // Replace with your IP
        'file://'
    ]
}));
```

### 3. Share the URL

Give neighbors this URL: `http://YOUR_IP:3001`

Example: `http://192.168.1.100:3001`

## Available Scripts

```bash
npm start          # Start the server
npm run dev        # Start with auto-restart (needs nodemon)
npm run init-db    # Initialize/reset database
npm test          # Test the API endpoints
```

## API Endpoints

Your local server provides these endpoints:

- `GET /api/health` - Server health check
- `GET /api/markers` - Get all markers
- `POST /api/markers` - Create/update marker
- `DELETE /api/markers?id=<id>` - Delete marker
- `GET /api/stats` - Database statistics
- `GET /api/settings` - App settings

Test with: `npm test`

## File Structure

```
trickortreat/
├── package.json          # Dependencies
├── server.js            # Express server
├── init-db.js           # Database setup
├── test-api.js          # API tests
├── config.js            # Frontend config
├── index.html           # Main app
├── app.js              # Frontend logic
├── styles.css          # Styling
├── trickortreat.db     # SQLite database (created)
└── neighborhood-map.jpg # Your map image
```

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Try a different port
set PORT=3002 && npm start
```

### Database Issues

```bash
# Reset the database
rm trickortreat.db
npm run init-db
```

### Frontend Not Connecting

1. Check server is running on http://localhost:3001
2. Check browser console for errors (F12)
3. Verify `config.js` has correct server URL

### Markers Not Syncing

1. Check network connectivity to server
2. Look for rate limiting messages in console
3. Verify multiple devices are using same server IP

## Backup and Restore

### Backup Your Data

```bash
# Copy the database file
cp trickortreat.db backup_$(date +%Y%m%d).db

# Or on Windows
copy trickortreat.db backup.db
```

### Restore Data

```bash
# Replace the current database
cp backup.db trickortreat.db
```

## Performance

### Expected Performance
- **Concurrent Users**: 10-50 neighborhood devices
- **Response Time**: <10ms on local network
- **Storage**: ~1KB per marker (very efficient)
- **Memory Usage**: ~50MB for server + database

### Optimization Tips
- Reduce `syncInterval` in config.js for faster updates
- Increase rate limits for busy neighborhoods
- Use SSD storage for better database performance

## Security Notes

This setup is designed for **local network use only**:

✅ **Safe for Local Use:**
- Rate limiting prevents abuse
- Input validation prevents bad data
- CORS restricts access to local network

⚠️ **Not for Internet Exposure:**
- No authentication system
- No HTTPS encryption
- Designed for trusted local network only

Perfect for neighborhood Halloween fun! 🎃