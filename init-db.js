// Database initialization script for Trick or Treat Map
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'trickortreat.db');

console.log('🎃 Initializing Trick or Treat Map Database...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database:', dbPath);
});

// Create markers table
db.serialize(() => {
    db.run(`
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
    `, (err) => {
        if (err) {
            console.error('❌ Error creating markers table:', err.message);
        } else {
            console.log('✅ Markers table created successfully');
        }
    });

    // Create index for better performance
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_markers_timestamp 
        ON markers(timestamp DESC)
    `, (err) => {
        if (err) {
            console.error('❌ Error creating index:', err.message);
        } else {
            console.log('✅ Database index created successfully');
        }
    });

    // Create settings table for app configuration
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating settings table:', err.message);
        } else {
            console.log('✅ Settings table created successfully');
        }
    });

    // Insert default settings
    db.run(`
        INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('max_markers', '100'),
        ('rate_limit_per_minute', '10'),
        ('app_title', 'Cartwright Ranch Trick or Treat Map'),
        ('map_center_lat', '33.6846'),
        ('map_center_lng', '-117.8265')
    `, (err) => {
        if (err) {
            console.error('❌ Error inserting default settings:', err.message);
        } else {
            console.log('✅ Default settings inserted');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err.message);
    } else {
        console.log('✅ Database initialization complete!');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('1. Run "npm install" to install dependencies');
        console.log('2. Run "npm start" to start the local server');
        console.log('3. Open index.html in your browser');
    }
});