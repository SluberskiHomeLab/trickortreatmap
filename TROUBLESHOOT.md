# 🚨 API "Not found" Error - Quick Fix Guide

## ⚡ **Start the Server First!**

The "Not found" error means your API server isn't running. Here's how to start it:

```powershell
# 1. Navigate to your project folder
cd "c:\Users\LocalAdmin\Documents\trickortreatmap\trickortreatmap"

# 2. Start the server
npm start
```

You should see:
```
🗄️ Database initialized successfully!
🚀 Server running on http://localhost:3001
```

## 🔍 **Test the API**

Once the server is running, open your browser and go to:
- **Health Check**: http://localhost:3001/api/health
- **View Markers**: http://localhost:3001/api/markers

## 🌐 **Open the Map**

After the server is running:
1. Open `index.html` in your browser
2. Or go to: http://localhost:3001 (if you set up static serving)

## ❓ **Still Getting Errors?**

### Check what URL you're trying to access:
- ✅ **Correct**: `http://localhost:3001/api/markers`
- ❌ **Wrong**: `http://localhost:3001/markers` (missing `/api/`)
- ❌ **Wrong**: `http://localhost:3000/api/markers` (wrong port)

### Common mistakes:
- Forgetting to start the server with `npm start`
- Using wrong port (should be 3001, not 3000)
- Missing `/api/` in the URL path
- Typos in endpoint names

## 🛠️ **Debug Commands**

```powershell
# Check if server is running
netstat -an | findstr :3001

# Restart server if needed
npm start

# Test from command line (if curl is installed)
curl http://localhost:3001/api/health
```

## 📋 **Available Endpoints**
- `GET /api/health` - Check if server is working
- `GET /api/markers` - Get all markers
- `POST /api/markers` - Add/update a marker
- `DELETE /api/markers?id=123` - Delete marker by ID
- `GET /api/settings` - Get app settings
- `GET /api/stats` - Get usage statistics