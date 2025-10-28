// Upgrade script to switch to better-sqlite3 (eliminates deprecated package warnings)
const fs = require('fs');
const path = require('path');

console.log('🔄 Upgrading to better-sqlite3 (no deprecated dependencies)...');

try {
    // Check if better files exist
    const betterServer = path.join(__dirname, 'server-better.js');
    const betterInitDb = path.join(__dirname, 'init-db-better.js');
    
    if (!fs.existsSync(betterServer) || !fs.existsSync(betterInitDb)) {
        console.error('❌ Better-sqlite3 files not found. Please ensure server-better.js and init-db-better.js exist.');
        process.exit(1);
    }
    
    // Backup original files
    const originalServer = path.join(__dirname, 'server.js');
    const originalInitDb = path.join(__dirname, 'init-db.js');
    
    if (fs.existsSync(originalServer)) {
        fs.copyFileSync(originalServer, path.join(__dirname, 'server-original.js'));
        console.log('✅ Backed up server.js to server-original.js');
    }
    
    if (fs.existsSync(originalInitDb)) {
        fs.copyFileSync(originalInitDb, path.join(__dirname, 'init-db-original.js'));
        console.log('✅ Backed up init-db.js to init-db-original.js');
    }
    
    // Replace with better versions
    fs.copyFileSync(betterServer, originalServer);
    fs.copyFileSync(betterInitDb, originalInitDb);
    
    console.log('✅ Replaced server.js with better-sqlite3 version');
    console.log('✅ Replaced init-db.js with better-sqlite3 version');
    
    console.log('\n🎉 Upgrade complete!');
    console.log('');
    console.log('📦 Next steps:');
    console.log('1. Delete node_modules: npm run clean');
    console.log('2. Install new dependencies: npm install');
    console.log('3. Initialize database: npm run init-db');
    console.log('4. Start server: npm start');
    console.log('');
    console.log('✨ The new version has:');
    console.log('  - No deprecated package warnings');
    console.log('  - Better performance with synchronous operations');
    console.log('  - Prepared statements for faster queries');
    console.log('  - WAL mode for better concurrency');
    
} catch (error) {
    console.error('❌ Upgrade failed:', error.message);
    process.exit(1);
}