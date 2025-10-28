// Quick test to verify database initialization works
const Database = require('better-sqlite3');
const path = require('path');

console.log('🧪 Testing database initialization...');

const testDbPath = path.join(__dirname, 'test-trickortreat.db');

try {
    // Test database creation and initialization
    const db = new Database(testDbPath);
    
    // Initialize schema (same as server.js)
    db.exec(`
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
    
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_markers_timestamp 
        ON markers(timestamp DESC)
    `);
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    console.log('✅ Database schema created');
    
    // Test prepared statements (this was causing the error)
    const testStatements = {
        getAllMarkers: db.prepare('SELECT * FROM markers LIMIT 5'),
        insertMarker: db.prepare(`
            INSERT INTO markers (id, x, y, timestamp, client_ip, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
    };
    
    console.log('✅ Prepared statements created successfully');
    
    // Test insert
    const now = new Date().toISOString();
    testStatements.insertMarker.run('test-1', 100, 200, now, '127.0.0.1', now, now);
    
    console.log('✅ Test insert successful');
    
    // Test select
    const markers = testStatements.getAllMarkers.all();
    console.log('✅ Test select successful, found', markers.length, 'markers');
    
    db.close();
    
    // Clean up test database
    const fs = require('fs');
    fs.unlinkSync(testDbPath);
    
    console.log('🎉 All tests passed! Database initialization fix is working.');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}