# 🚨 Reverse Proxy & Marker Issues - Troubleshooting Guide

## 🔍 **Quick Diagnosis Steps**

### 1. **Load the Debug Script**
Open your browser console and paste this script:
```javascript
// Load the debugging script
const script = document.createElement('script');
script.src = './debug-reverse-proxy.js';
document.head.appendChild(script);
```

### 2. **Check Basic Connectivity**
In browser console:
```javascript
// Test direct API access
fetch('/api/health')
  .then(r => r.json())
  .then(d => console.log('Health check:', d))
  .catch(e => console.error('Health check failed:', e));
```

### 3. **Verify Configuration**
```javascript
console.log('Config:', window.CONFIG);
console.log('API Client:', window.apiClient);
```

---

## 🔧 **Common Issues & Fixes**

### **Issue 1: API Calls Failing Through Reverse Proxy**

**Symptoms:**
- Network errors when adding markers
- 404 errors on `/api/` endpoints
- CORS errors in console

**Diagnosis:**
```bash
# Test API endpoints directly
curl -v http://your-domain.com/api/health
curl -v http://your-domain.com/api/markers
```

**Fixes:**

#### **A. Nginx Configuration Issues**
Check your nginx config:
```nginx
location /api/ {
    proxy_pass http://localhost:3001/api/;  # Note the trailing slash
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

#### **B. Path Rewriting Issues**
If your app is in a subdirectory:
```nginx
location /trickortreat/ {
    # Remove subdirectory prefix
    rewrite ^/trickortreat/(.*) /$1 break;
    proxy_pass http://localhost:3001;
    # ... other headers
}
```

#### **C. CORS Issues**
Update your `.env` file:
```env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
TRUST_PROXY=true
```

### **Issue 2: Markers Not Saving/Displaying**

**Symptoms:**
- Markers appear briefly then disappear
- No markers persist after refresh
- Database errors in server logs

**Diagnosis:**
1. **Check server logs** for database errors
2. **Test marker endpoints**:
   ```javascript
   // Test adding a marker
   fetch('/api/markers', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       id: 'test-' + Date.now(),
       x: 50, y: 50,
       lat: 33.6846, lng: -117.8265
     })
   }).then(r => r.json()).then(console.log);
   ```

**Fixes:**

#### **A. Database Not Initialized**
The server should auto-initialize, but if not:
```bash
# Manually initialize database
npm run init-db
```

#### **B. Database Permissions**
```bash
# Check database file permissions
ls -la trickortreat.db
chmod 664 trickortreat.db  # If needed
```

#### **C. Database Path Issues**
Check your `.env`:
```env
DB_PATH=./data/trickortreat.db
```
Make sure the directory exists:
```bash
mkdir -p data
```

### **Issue 3: Static Files Not Loading**

**Symptoms:**
- Blank page or broken layout
- 404 errors for .js, .css files
- "Cannot GET /" errors

**Fixes:**

#### **A. Nginx Static File Serving**
```nginx
# Option 1: Let nginx serve static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|html)$ {
    root /path/to/your/trickortreatmap/trickortreatmap;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Option 2: Proxy all to Node.js
location / {
    proxy_pass http://localhost:3001;
    # ... headers
}
```

#### **B. Node.js Serving Issues**
Ensure server.js has:
```javascript
app.use(express.static('.'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
```

---

## 🧪 **Testing & Verification**

### **Test 1: Direct Server Access**
```bash
# Test Node.js server directly
curl http://localhost:3001/api/health
curl http://localhost:3001/
```

### **Test 2: Through Reverse Proxy**
```bash
# Test through your domain
curl https://yourdomain.com/api/health
curl https://yourdomain.com/
```

### **Test 3: Marker Operations**
```javascript
// In browser console
async function testMarkers() {
    try {
        // Get markers
        let markers = await fetch('/api/markers').then(r => r.json());
        console.log('Current markers:', markers);
        
        // Add test marker
        const testMarker = {
            id: 'debug-' + Date.now(),
            x: 25, y: 75,
            lat: 33.6846, lng: -117.8265
        };
        
        const added = await fetch('/api/markers', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(testMarker)
        }).then(r => r.json());
        console.log('Added marker:', added);
        
        // Get markers again
        markers = await fetch('/api/markers').then(r => r.json());
        console.log('Updated markers:', markers);
        
        // Clean up test marker
        await fetch(`/api/markers?id=${testMarker.id}`, {method: 'DELETE'});
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testMarkers();
```

---

## 🔍 **Advanced Debugging**

### **Enable Verbose Logging**
Update `.env`:
```env
NODE_ENV=development  # Temporarily for debugging
LOG_LEVEL=debug
```

### **Check Request Headers**
```javascript
// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('Fetch request:', args);
    return originalFetch.apply(this, arguments)
        .then(response => {
            console.log('Fetch response:', response);
            return response;
        });
};
```

### **Network Tab Analysis**
1. Open DevTools → Network tab
2. Try adding a marker
3. Look for:
   - Failed requests (red)
   - CORS preflight OPTIONS requests
   - Response codes and headers

### **Server Log Analysis**
```bash
# Watch server logs
tail -f logs/app.log  # If logging to file
# Or check console output
```

---

## ✅ **Expected Behavior**

When working correctly, you should see:

1. **Console logs:**
   ```
   📋 Configuration loaded - Server/Proxy Deployment mode
   🌐 API Base URL: Same Origin
   🗄️ SQLite backend ready
   ```

2. **Network requests:**
   - `GET /api/health` → 200 OK
   - `GET /api/markers` → 200 OK with markers array
   - `POST /api/markers` → 200 OK when adding markers

3. **Server logs:**
   ```
   GET /api/health - 200
   GET /api/markers - 200  
   POST /api/markers - 200
   ```

---

## 🆘 **Still Not Working?**

### **Collect Debug Information:**
1. Run the debug script in browser console
2. Check browser Network tab for failed requests
3. Check server console logs for errors
4. Test API endpoints with curl/Postman
5. Verify reverse proxy configuration

### **Common Final Checks:**
- [ ] Server is running on port 3001
- [ ] Database file exists and is writable
- [ ] Reverse proxy is forwarding `/api/` correctly
- [ ] CORS headers are properly configured
- [ ] No JavaScript errors in browser console
- [ ] Static files are being served correctly