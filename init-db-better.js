// Database initialization script using better-sqlite3 (no deprecated dependencies)
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'trickortreat.db');

console.log('🎃 Initializing Trick or Treat Map Database (better-sqlite3)...');

try {
    const db = new Database(dbPath);
    console.log('✅ Connected to SQLite database:', dbPath);

    // Create markers table
    const createMarkersTable = db.prepare(`
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

    createMarkersTable.run();
    console.log('✅ Markers table created successfully');

    // Create index for better performance
    const createIndex = db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_markers_timestamp 
        ON markers(timestamp DESC)
    `);

    createIndex.run();
    console.log('✅ Database index created successfully');

    // Create settings table for app configuration
    const createSettingsTable = db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    createSettingsTable.run();
    console.log('✅ Settings table created successfully');

    // Insert default settings
    const insertSetting = db.prepare(`
        INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    const defaultSettings = [
        ['max_markers', '100'],
        ['rate_limit_per_minute', '10'],
        ['app_title', 'Cartwright Ranch Trick or Treat Map'],
        ['map_center_lat', '33.6846'],
        ['map_center_lng', '-117.8265']
    ];

    const insertMany = db.transaction((settings) => {
        for (const setting of settings) {
            insertSetting.run(setting);
        }
    });

    insertMany(defaultSettings);
    console.log('✅ Default settings inserted');

    // Get database info
    const info = db.pragma('database_list');
    console.log('✅ Database file size:', require('fs').statSync(dbPath).size, 'bytes');

    db.close();
    console.log('✅ Database initialization complete!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Run "npm install" to install dependencies');
    console.log('2. Run "npm start" to start the local server');
    console.log('3. Open index.html in your browser');

} catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
}