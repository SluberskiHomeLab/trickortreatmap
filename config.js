// Local development configuration
// This points to the local Node.js/Express server with SQLite database

window.CONFIG = {
    // Local Express server API endpoint
    api: {
        baseUrl: "http://localhost:3001",  // Local server URL
        endpoints: {
            markers: "/api/markers",
            health: "/api/health",
            stats: "/api/stats",
            settings: "/api/settings"
        }
    },
    
    // Optional Google Maps integration
    googleMapsApiKey: "",        // Add your Google Maps API key here if desired
    
    // Local server settings
    server: {
        host: "localhost",
        port: 3001,
        autoStart: true          // Whether to suggest starting the server
    },
    
    // Storage settings
    storage: {
        type: "sqlite",          // Local SQLite database
        maxMarkers: 100,         // Maximum markers per area
        syncInterval: 10000      // Sync every 10 seconds (faster for local)
    }
};

console.log('📋 Configuration loaded - Local SQLite backend ready');