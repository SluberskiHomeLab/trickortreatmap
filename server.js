// Local Express server for Trick or Treat Map with SQLite backend
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const dbPath = path.join(__dirname, 'trickortreat.db');

// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database');
});

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

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'trickortreat-local-api',
        database: 'connected'
    });
});

// Get all markers
app.get('/api/markers', (req, res) => {
    const query = `
        SELECT id, x, y, lat, lng, timestamp, created_at 
        FROM markers 
        ORDER BY created_at DESC 
        LIMIT 1000
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
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
    });
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
    
    const clientIp = getClientIp(req);
    const timestamp = new Date().toISOString();
    
    // Check if marker exists (update) or create new
    db.get('SELECT id FROM markers WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (row) {
            // Update existing marker
            const updateQuery = `
                UPDATE markers 
                SET x = ?, y = ?, lat = ?, lng = ?, client_ip = ?, updated_at = ?
                WHERE id = ?
            `;
            
            db.run(updateQuery, [x, y, lat, lng, clientIp, timestamp, id], function(err) {
                if (err) {
                    console.error('❌ Database error:', err.message);
                    return res.status(500).json({ error: 'Failed to update marker' });
                }
                
                console.log(`✅ Updated marker: ${id}`);
                res.status(200).json({
                    success: true,
                    action: 'updated',
                    marker: { id, x, y, lat, lng, timestamp, client_ip: clientIp }
                });
            });
        } else {
            // Check marker count limit
            db.get('SELECT COUNT(*) as count FROM markers', [], (err, result) => {
                if (err) {
                    console.error('❌ Database error:', err.message);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (result.count >= 100) {
                    return res.status(429).json({ error: 'Maximum markers limit reached (100)' });
                }
                
                // Create new marker
                const insertQuery = `
                    INSERT INTO markers (id, x, y, lat, lng, timestamp, client_ip, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                db.run(insertQuery, [id, x, y, lat, lng, timestamp, clientIp, timestamp, timestamp], function(err) {
                    if (err) {
                        console.error('❌ Database error:', err.message);
                        return res.status(500).json({ error: 'Failed to create marker' });
                    }
                    
                    console.log(`✅ Created marker: ${id}`);
                    res.status(201).json({
                        success: true,
                        action: 'created',
                        marker: { id, x, y, lat, lng, timestamp, client_ip: clientIp }
                    });
                });
            });
        }
    });
});

// Delete marker
app.delete('/api/markers', (req, res) => {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'Missing marker id parameter' });
    }
    
    db.run('DELETE FROM markers WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ error: 'Failed to delete marker' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Marker not found' });
        }
        
        console.log(`✅ Deleted marker: ${id}`);
        res.json({
            success: true,
            deletedId: id,
            remaining: null // We could query this if needed
        });
    });
});

// Get app settings
app.get('/api/settings', (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            console.error('❌ Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        
        res.json({ settings });
    });
});

// Database statistics
app.get('/api/stats', (req, res) => {
    db.serialize(() => {
        const stats = {};
        
        // Get marker count
        db.get('SELECT COUNT(*) as count FROM markers', [], (err, result) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return res.status(500).json({ error: 'Database error' });
            }
            
            stats.totalMarkers = result.count;
            
            // Get markers from last 24 hours
            db.get(`
                SELECT COUNT(*) as count FROM markers 
                WHERE created_at > datetime('now', '-1 day')
            `, [], (err, result) => {
                if (err) {
                    console.error('❌ Database error:', err.message);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                stats.markersLast24h = result.count;
                stats.timestamp = new Date().toISOString();
                
                res.json({ stats });
            });
        });
    });
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
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err.message);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🎃 Trick or Treat Map Server Started!');
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
    console.log('\n🚀 Ready for trick-or-treaters!');
});