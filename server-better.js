// Local Express server using better-sqlite3 (no deprecated dependencies)
const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const dbPath = path.join(__dirname, 'trickortreat.db');

// Database connection (synchronous with better-sqlite3)
let db;
try {
    db = new Database(dbPath);
    console.log('✅ Connected to SQLite database');
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
} catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    process.exit(1);
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for development
}));

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'file://'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.', { 
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

app.use('/api/', limiter);

// Logging middleware
app.use('/api/', (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Helper function to get client IP
function getClientIp(req) {
    return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
}

// Prepared statements for better performance
const statements = {
    getAllMarkers: db.prepare(`
        SELECT id, x, y, lat, lng, timestamp, created_at 
        FROM markers 
        ORDER BY created_at DESC 
        LIMIT 1000
    `),
    
    getMarkerById: db.prepare('SELECT id FROM markers WHERE id = ?'),
    
    insertMarker: db.prepare(`
        INSERT INTO markers (id, x, y, lat, lng, timestamp, client_ip, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    
    updateMarker: db.prepare(`
        UPDATE markers 
        SET x = ?, y = ?, lat = ?, lng = ?, client_ip = ?, updated_at = ?
        WHERE id = ?
    `),
    
    deleteMarker: db.prepare('DELETE FROM markers WHERE id = ?'),
    
    countMarkers: db.prepare('SELECT COUNT(*) as count FROM markers'),
    
    countRecentMarkers: db.prepare(`
        SELECT COUNT(*) as count FROM markers 
        WHERE created_at > datetime('now', '-1 day')
    `),
    
    getAllSettings: db.prepare('SELECT key, value FROM settings')
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'trickortreat-local-api',
        database: 'connected',
        version: '2.0.0'
    });
});

// Get all markers
app.get('/api/markers', (req, res) => {
    try {
        const rows = statements.getAllMarkers.all();
        
        // Convert timestamps to ISO strings for consistency
        const markers = rows.map(row => ({
            ...row,
            timestamp: row.timestamp || row.created_at,
            created_at: row.created_at
        }));
        
        res.json({ 
            markers,
            total: markers.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Database error:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create/Update marker
app.post('/api/markers', (req, res) => {
    const { id, x, y, lat, lng } = req.body;
    
    // Validation
    if (!id || typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({ 
            error: 'Missing required fields: id, x, y' 
        });
    }
    
    if (x < 0 || x > 100 || y < 0 || y > 100) {
        return res.status(400).json({ 
            error: 'Coordinates must be between 0 and 100' 
        });
    }
    
    try {
        const clientIp = getClientIp(req);
        const timestamp = new Date().toISOString();
        
        // Check if marker exists (update) or create new
        const existingMarker = statements.getMarkerById.get(id);
        
        if (existingMarker) {
            // Update existing marker
            statements.updateMarker.run(x, y, lat, lng, clientIp, timestamp, id);
            
            console.log(`✅ Updated marker: ${id}`);
            res.status(200).json({
                success: true,
                action: 'updated',
                marker: { id, x, y, lat, lng, timestamp, client_ip: clientIp }
            });
        } else {
            // Check marker count limit
            const result = statements.countMarkers.get();
            
            if (result.count >= 100) {
                return res.status(429).json({ error: 'Maximum markers limit reached (100)' });
            }
            
            // Create new marker
            statements.insertMarker.run(id, x, y, lat, lng, timestamp, clientIp, timestamp, timestamp);
            
            console.log(`✅ Created marker: ${id}`);
            res.status(201).json({
                success: true,
                action: 'created',
                marker: { id, x, y, lat, lng, timestamp, client_ip: clientIp }
            });
        }
    } catch (error) {
        console.error('❌ Database error:', error.message);
        res.status(500).json({ error: 'Failed to save marker' });
    }
});

// Delete marker
app.delete('/api/markers', (req, res) => {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'Missing marker id parameter' });
    }
    
    try {
        const result = statements.deleteMarker.run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Marker not found' });
        }
        
        console.log(`✅ Deleted marker: ${id}`);
        res.json({
            success: true,
            deletedId: id,
            remaining: null
        });
    } catch (error) {
        console.error('❌ Database error:', error.message);
        res.status(500).json({ error: 'Failed to delete marker' });
    }
});

// Get app settings
app.get('/api/settings', (req, res) => {
    try {
        const rows = statements.getAllSettings.all();
        
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        
        res.json({ settings });
    } catch (error) {
        console.error('❌ Database error:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Database statistics
app.get('/api/stats', (req, res) => {
    try {
        const totalMarkers = statements.countMarkers.get().count;
        const recentMarkers = statements.countRecentMarkers.get().count;
        
        const stats = {
            totalMarkers,
            markersLast24h: recentMarkers,
            timestamp: new Date().toISOString()
        };
        
        res.json({ stats });
    } catch (error) {
        console.error('❌ Database error:', error.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Serve static files (including index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (db) {
        db.close();
        console.log('✅ Database connection closed');
    }
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('🎃 Trick or Treat Map Server Started! (v2.0.0 - better-sqlite3)');
    console.log(`🌐 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/`);
    console.log(`🗄️ Database: ${dbPath}`);
    console.log('\n📍 API Endpoints:');
    console.log('  GET  /api/health   - Health check');
    console.log('  GET  /api/markers  - Get all markers');
    console.log('  POST /api/markers  - Create/update marker');
    console.log('  DELETE /api/markers?id=<id> - Delete marker');
    console.log('  GET  /api/settings - Get app settings');
    console.log('  GET  /api/stats    - Get statistics');
    console.log('\n🚀 Ready for trick-or-treaters! (No deprecated packages!)');
});