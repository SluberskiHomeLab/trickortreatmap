// Configuration supporting both local development and reverse proxy deployment
// Auto-detects environment and uses appropriate API endpoints

window.CONFIG = {
    // API endpoint configuration - works with reverse proxy or direct access
    api: {
        // Smart base URL detection for different deployment scenarios
        baseUrl: (function() {
            // Local file access (development)
            if (window.location.protocol === 'file:') {
                return "http://localhost:3001";
            }
            
            // Check if we're on a non-standard port that's not the API port
            const currentPort = window.location.port;
            const isStandardPort = !currentPort || currentPort === '80' || currentPort === '443';
            
            // If we're on standard web ports (80/443) or a reverse proxy, use relative URLs
            // If we're on port 3001, we're directly accessing the Node.js server
            if (isStandardPort || currentPort !== '3001') {
                return ""; // Use current origin (reverse proxy)
            } else {
                return ""; // Direct server access, still use relative paths
            }
        })(),
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