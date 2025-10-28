// Configuration supporting both local development and reverse proxy deployment
// Auto-detects environment and uses appropriate API endpoints

window.CONFIG = {
    // API endpoint configuration - works with reverse proxy or direct access
    api: {
        // Use relative path for reverse proxy, fallback to localhost for development
        baseUrl: window.location.protocol === 'file:' 
            ? "http://localhost:3001"  // Local file access (development)
            : "",  // Use current origin (reverse proxy or direct server access)
        endpoints: {
            markers: "/api/markers",
            health: "/api/health",
            stats: "/api/stats",
            settings: "/api/settings"
        }
    },
    
    // Optional Google Maps integration
    googleMapsApiKey: "",        // Add your Google Maps API key here if desired
    
    // Server settings (for development and deployment info)
    server: {
        host: window.location.hostname || "localhost",
        port: window.location.port || 3001,
        autoStart: window.location.protocol === 'file:'  // Only suggest starting for local files
    },
    
    // Storage settings
    storage: {
        type: "sqlite",          // Local SQLite database
        maxMarkers: 100,         // Maximum markers per area
        syncInterval: 10000      // Sync every 10 seconds (faster for local)
    }
};

// Log configuration details
const deploymentMode = window.location.protocol === 'file:' ? 'Local Development' : 'Server/Proxy Deployment';
console.log(`📋 Configuration loaded - ${deploymentMode} mode`);
console.log(`🌐 API Base URL: ${window.CONFIG.api.baseUrl || 'Same Origin'}`);
console.log(`🗄️ SQLite backend ready`);