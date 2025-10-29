// Local Express server using better-sqlite3 (no deprecated dependencies)
// Load environment variables
require('dotenv').config();

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Environment configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'trickortreat.db');
const TRUST_PROXY = process.env.TRUST_PROXY === 'true' || NODE_ENV === 'production';
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20;

console.log(`🚀 Starting Trick-or-Treat Map Server`);
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`🗄️ Database: ${DB_PATH}`);
console.log(`🔒 Proxy Trust: ${TRUST_PROXY}`);

// Configure reverse proxy support
app.set('trust proxy', TRUST_PROXY);

// Database connection and initialization (synchronous with better-sqlite3)
let db;
try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    
    db = new Database(DB_PATH);
    console.log('✅ Connected to SQLite database');
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    
    // Initialize database schema (create tables if they don't exist)
    initializeDatabase(db);
    
} catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    process.exit(1);
}

// Database initialization function
function initializeDatabase(database) {
    try {
        console.log('🔧 Initializing database schema...');
        
        // Create markers table
        database.exec(`
            CREATE TABLE IF NOT EXISTS markers (
                id TEXT PRIMARY KEY,
                x REAL NOT NULL,
                y REAL NOT NULL,
                lat REAL,
                lng REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                client_ip TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create index for better performance
        database.exec(`
            CREATE INDEX IF NOT EXISTS idx_markers_timestamp 
            ON markers(timestamp DESC)
        `);
        
        // Create settings table for app configuration
        database.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Database schema initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        throw error;
    }
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for development
    crossOriginEmbedderPolicy: false // Allow iframe embedding for reverse proxy
}));

// CORS configuration for reverse proxy deployment
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Check environment variable for allowed origins
        const allowedOrigins = process.env.CORS_ORIGIN;
        if (allowedOrigins && allowedOrigins !== '*') {
            const origins = allowedOrigins.split(',').map(o => o.trim());
            if (origins.includes(origin)) return callback(null, true);
        } else if (allowedOrigins === '*') {
            return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow file:// protocol for local HTML files
        if (origin.startsWith('file://')) {
            return callback(null, true);
        }
        
        // In production, allow the origin (reverse proxy will handle domain validation)
        if (NODE_ENV === 'production') {
            return callback(null, true);
        }
        
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For', 'X-Real-IP']
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));

// Debugging middleware for reverse proxy
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        console.log('  Origin:', req.get('Origin') || 'none');
        console.log('  X-Forwarded-For:', req.get('X-Forwarded-For') || 'none');
        console.log('  X-Real-IP:', req.get('X-Real-IP') || 'none');
        console.log('  User-Agent:', req.get('User-Agent') || 'none');
        next();
    });
}

// Static file serving with proper headers for reverse proxy
app.use(express.static('.', { 
    setHeaders: (res, filePath) => {
        // No cache for HTML files
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Cache static assets
        else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
        // CORS headers for all files when needed
        if (NODE_ENV === 'production') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// Logging middleware
app.use('/api/', (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Helper function to get client IP (reverse proxy aware)
function getClientIp(req) {
    // Check for X-Forwarded-For header (reverse proxy)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first (original client)
        return xForwardedFor.split(',')[0].trim();
    }
    
    // Check for X-Real-IP header (nginx)
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
        return xRealIp;
    }
    
    // Fallback to Express's req.ip (works with trust proxy)
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

// 404 handler with debugging info
app.use((req, res) => {
    console.log(`❌ 404 - Not Found: ${req.method} ${req.url}`);
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
    
    const debugInfo = NODE_ENV === 'development' ? {
        method: req.method,
        url: req.url,
        headers: req.headers,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/markers',
            'POST /api/markers',
            'DELETE /api/markers?id=<id>',
            'GET /api/settings',
            'GET /api/stats',
            'GET /'
        ]
    } : undefined;
    
    res.status(404).json({ 
        error: 'Not found',
        path: req.url,
        debug: debugInfo
    });
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
    console.log(`🗄️ Database: ${DB_PATH}`);
    console.log('\n📍 API Endpoints:');
    console.log('  GET  /api/health   - Health check');
    console.log('  GET  /api/markers  - Get all markers');
    console.log('  POST /api/markers  - Create/update marker');
    console.log('  DELETE /api/markers?id=<id> - Delete marker');
    console.log('  GET  /api/settings - Get app settings');
    console.log('  GET  /api/stats    - Get statistics');
    console.log('\n🚀 Ready for trick-or-treaters! (No deprecated packages!)');
});