// Simple interactive map for trick-or-treat locations
// Configuration loaded from config.js

// Get API configuration
function getApiConfig() {
    if (window.CONFIG && window.CONFIG.api && window.CONFIG.api.baseUrl && window.CONFIG.api.baseUrl !== '') {
        console.log('🔧 Using local SQLite API configuration from config.js');
        console.log('🏠 Local server:', window.CONFIG.api.baseUrl);
        return window.CONFIG.api;
    }
    
    console.log('⚠️ Local API not configured - using localStorage fallback');
    return null;
}

// Get Google Maps API key
function getGoogleMapsApiKey() {
    if (window.CONFIG && window.CONFIG.googleMapsApiKey && window.CONFIG.googleMapsApiKey !== '') {
        console.log('🔧 Using Google Maps API key from config.js');
        return window.CONFIG.googleMapsApiKey;
    }
    
    console.log('⚠️ Google Maps API key not configured');
    return null;
}

// Set configuration
const API_CONFIG = getApiConfig();
const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// Google Maps Configuration
const GOOGLE_MAPS_CONFIG = {
    // Default location: Cartwright Ranch area (update with actual coordinates)
    center: { lat: 33.6846, lng: -117.8265 }, // Example: Irvine, CA area
    zoom: 16
};

// Expose configuration to window for debugging
window.API_CONFIG = API_CONFIG;
window.GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_API_KEY;

// Coordinate conversion constants
// These values control how grid coordinates (0-100%) map to lat/lng offsets
const COORD_CONVERSION = {
    LAT_SCALE: 1000,  // Divider for latitude offset calculation
    LNG_SCALE: 1000,  // Divider for longitude offset calculation
    CENTER_OFFSET: 50 // Percentage representing center of grid (50%)
};

let markers = [];
let addingMarkerMode = false;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let apiClient = null;
let googleMap = null;
let googleMarkers = [];
let isGoogleMapView = false;
let useApi = false;
let syncInterval = null;

// R2 API Client
class R2ApiClient {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.endpoints = config.endpoints;
        this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
    }
    
    async get(endpoint) {
        if (!this.rateLimiter.allowRequest()) {
            throw new Error('Rate limit exceeded');
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async post(endpoint, data) {
        if (!this.rateLimiter.allowRequest()) {
            throw new Error('Rate limit exceeded');
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async delete(endpoint, id) {
        if (!this.rateLimiter.allowRequest()) {
            throw new Error('Rate limit exceeded');
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    async healthCheck() {
        try {
            const result = await this.get(this.endpoints.health);
            return result.status === 'healthy';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

// Simple rate limiter
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    allowRequest() {
        const now = Date.now();
        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            return false;
        }
        
        this.requests.push(now);
        return true;
    }
}

// Initialize R2 API
async function initApi() {
    try {
        // Check if API config is available
        if (!API_CONFIG) {
            console.log("API not configured. Using localStorage fallback.");
            return false;
        }
        
        apiClient = new R2ApiClient(API_CONFIG);
        
        // Test connection
        const isHealthy = await apiClient.healthCheck();
        if (!isHealthy) {
            console.warn("API health check failed. Using localStorage fallback.");
            return false;
        }
        
        console.log('✅ R2 API initialized successfully');
        
        // Load initial markers
        await loadMarkersFromApi();
        
        // Set up periodic sync (faster for local server)
        const syncTime = window.CONFIG?.storage?.syncInterval || 10000; // 10 seconds default
        syncInterval = setInterval(loadMarkersFromApi, syncTime);
        console.log(`⏰ Auto-sync enabled every ${syncTime/1000} seconds`);
        
        return true;
    } catch (error) {
        console.error("API initialization error:", error);
        console.log("Falling back to localStorage...");
        return false;
    }
}

// Load markers from R2 API
async function loadMarkersFromApi() {
    try {
        if (!apiClient) return;
        
        const response = await apiClient.get(apiClient.endpoints.markers);
        const markerData = response.markers || [];
        
        syncMarkersFromApi(markerData);
        
    } catch (error) {
        console.error('Failed to load markers from API:', error);
        // Fallback to localStorage if API fails
        loadMarkersFromStorage();
    }
}

// Sync markers from API data
function syncMarkersFromApi(markerData) {
    // Clear existing markers
    markers.forEach(m => m.element && m.element.remove());
    markers = [];
    
    if (isGoogleMapView) {
        googleMarkers.forEach(m => m.setMap(null));
        googleMarkers = [];
    }
    
    // Add markers from API
    markerData.forEach(marker => {
        // Determine marker type based on available coordinates
        const hasLatLng = marker.lat !== undefined && marker.lng !== undefined;
        const hasXY = marker.x !== undefined && marker.y !== undefined;
        
        if (isGoogleMapView && hasLatLng) {
            addGoogleMarker(marker.lat, marker.lng, marker.id, false);
        } else if (isGoogleMapView && hasXY) {
            // Convert grid coordinates to lat/lng for Google Maps
            const lat = GOOGLE_MAPS_CONFIG.center.lat + ((marker.y - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LAT_SCALE);
            const lng = GOOGLE_MAPS_CONFIG.center.lng + ((marker.x - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LNG_SCALE);
            addGoogleMarker(lat, lng, marker.id, false);
        } else if (!isGoogleMapView && hasXY) {
            addMarker(marker.x, marker.y, false, marker.id);
        } else if (!isGoogleMapView && hasLatLng) {
            // Convert lat/lng to grid coordinates
            const x = COORD_CONVERSION.CENTER_OFFSET + ((marker.lng - GOOGLE_MAPS_CONFIG.center.lng) * COORD_CONVERSION.LNG_SCALE);
            const y = COORD_CONVERSION.CENTER_OFFSET + ((marker.lat - GOOGLE_MAPS_CONFIG.center.lat) * COORD_CONVERSION.LAT_SCALE);
            addMarker(x, y, false, marker.id);
        }
    });
}

// Save marker to API
async function saveMarkerToApi(marker) {
    try {
        if (!apiClient) {
            saveMarkerToStorage(marker);
            return;
        }
        
        await apiClient.post(apiClient.endpoints.markers, marker);
        console.log('✅ Marker saved to API');
        
    } catch (error) {
        console.error('Failed to save marker to API:', error);
        // Fallback to localStorage
        saveMarkerToStorage(marker);
    }
}

// Delete marker from API
async function deleteMarkerFromApi(markerId) {
    try {
        if (!apiClient) {
            deleteMarkerFromStorage(markerId);
            return;
        }
        
        await apiClient.delete(apiClient.endpoints.markers, markerId);
        console.log('✅ Marker deleted from API');
        
    } catch (error) {
        console.error('Failed to delete marker from API:', error);
        // Fallback to localStorage
        deleteMarkerFromStorage(markerId);
    }
}

// Initialize the map
async function initMap() {
    console.log('🎃 Initializing Trick or Treat Map...');
    const mapElement = document.getElementById('map');
    
    if (!mapElement) {
        console.error('❌ Map element not found!');
        return;
    }
    
    // Initialize API
    useApi = await initApi();
    console.log('🌐 API enabled:', useApi);
    
    // Setup neighborhood image
    setupNeighborhoodImage();
    
    // Load saved markers
    if (!useApi) {
        console.log('💾 Loading markers from localStorage...');
        loadMarkers();
    }
    
    console.log('✅ Map initialization complete');
    
    // Add event listeners
    mapElement.addEventListener('click', onMapClick);
    mapElement.addEventListener('mousedown', startDrag);
    mapElement.addEventListener('mousemove', drag);
    mapElement.addEventListener('mouseup', endDrag);
    mapElement.addEventListener('mouseleave', endDrag);
}

// Initialize Google Maps
// Load Google Maps API dynamically with secure API key
function loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
        // Check if API key is configured
        if (GOOGLE_MAPS_API_KEY === "PLACEHOLDER_GOOGLE_MAPS_API_KEY" || !GOOGLE_MAPS_API_KEY) {
            console.warn("Google Maps API key not configured. Google Maps features disabled.");
            reject(new Error("Google Maps API key not configured"));
            return;
        }

        // Check if Google Maps is already loaded
        if (typeof google !== 'undefined' && google.maps) {
            resolve();
            return;
        }

        // Create and load the Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initGoogleMapCallback`;
        script.async = true;
        script.defer = true;
        
        // Set up callback for when Google Maps loads
        window.initGoogleMapCallback = () => {
            initGoogleMap();
            resolve();
        };
        
        script.onerror = () => {
            console.error("Failed to load Google Maps API");
            reject(new Error("Failed to load Google Maps API"));
        };
        
        document.head.appendChild(script);
    });
}

function initGoogleMap() {
    try {
        const googleMapElement = document.getElementById('googleMap');
        
        googleMap = new google.maps.Map(googleMapElement, {
            center: GOOGLE_MAPS_CONFIG.center,
            zoom: GOOGLE_MAPS_CONFIG.zoom,
            mapTypeId: 'roadmap'
        });
        
        // Add click listener for adding markers
        googleMap.addListener('click', (e) => {
            if (addingMarkerMode) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                addGoogleMarker(lat, lng, null, true);
                toggleAddMarkerMode(false);
            }
        });
        
        console.log("Google Maps initialized successfully");
    } catch (error) {
        console.error("Google Maps initialization error:", error);
        showConfigNotice();
    }
}

// Toggle between grid view and Google Maps view
function toggleMapView() {
    const gridMap = document.getElementById('map');
    const googleMapElement = document.getElementById('googleMap');
    
    // If Google Maps isn't loaded yet, try to load it
    if (!googleMap) {
        // Show loading message
        const button = document.getElementById('toggleMapBtn');
        const originalText = button.textContent;
        button.textContent = '🔄 Loading Maps...';
        button.disabled = true;
        
        loadGoogleMapsAPI()
            .then(() => {
                // Success - now we can toggle
                button.textContent = originalText;
                button.disabled = false;
                toggleMapView(); // Recursively call after loading
            })
            .catch((error) => {
                // Failed to load
                button.textContent = originalText;
                button.disabled = false;
                alert("Google Maps not available. Please configure API key in GitHub repository secrets.");
                console.error("Google Maps loading failed:", error);
            });
        return;
    }
    
    isGoogleMapView = !isGoogleMapView;
    
    if (isGoogleMapView) {
        gridMap.style.display = 'none';
        googleMapElement.style.display = 'block';
        
        // Transfer markers to Google Maps
        transferMarkersToGoogleMap();
    } else {
        gridMap.style.display = 'block';
        googleMapElement.style.display = 'none';
        
        // Transfer markers back to grid
        transferMarkersToGrid();
    }
}

// Setup neighborhood image
function setupNeighborhoodImage() {
    const imageElement = document.getElementById('neighborhoodImage');
    
    if (!imageElement) {
        console.error('❌ Neighborhood image element not found');
        return;
    }
    
    // Handle image load error - provide fallback
    imageElement.addEventListener('error', () => {
        console.warn('🖼️ Neighborhood image not found. Creating placeholder.');
        createImagePlaceholder();
    });
    
    // Handle successful image load
    imageElement.addEventListener('load', () => {
        console.log('✅ Neighborhood image loaded successfully');
    });
    
    // Test if image exists by trying to load it
    console.log('🖼️ Attempting to load neighborhood image:', imageElement.src);
}

// Create a placeholder when no neighborhood image is available
function createImagePlaceholder() {
    const mapElement = document.getElementById('map');
    const imageElement = document.getElementById('neighborhoodImage');
    
    // Hide the broken image
    imageElement.style.display = 'none';
    
    // Create a placeholder with instructions
    const placeholder = document.createElement('div');
    placeholder.id = 'imagePlaceholder';
    placeholder.innerHTML = `
        <div style="
            width: 100%; 
            height: 100%; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
            color: #155724;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        ">
            <h3 style="margin-bottom: 15px; color: #ff6600;">📍 Add Your Neighborhood Map</h3>
            <p style="margin-bottom: 10px;">To use a custom neighborhood image:</p>
            <ol style="text-align: left; margin-bottom: 15px;">
                <li>Take a screenshot of your neighborhood from Google Maps</li>
                <li>Save it as "neighborhood-map.jpg"</li>
                <li>Place it in the same folder as this HTML file</li>
                <li>Refresh the page</li>
            </ol>
            <p style="font-weight: bold; color: #ff6600;">Click anywhere to place your 🎃 pumpkin marker!</p>
        </div>
    `;
    
    mapElement.appendChild(placeholder);
}

// Handle map clicks
function onMapClick(e) {
    console.log('🖱️ Map clicked, adding marker mode:', addingMarkerMode);
    
    if (!addingMarkerMode) {
        console.log('ℹ️ Not in adding marker mode, ignoring click');
        return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    console.log('📍 Placing marker at:', Math.round(xPercent) + '%,', Math.round(yPercent) + '%');
    
    addMarker(xPercent, yPercent);
    toggleAddMarkerMode(false);
}

// Add a marker to the map
function addMarker(xPercent, yPercent, save = true, id = null) {
    const mapElement = document.getElementById('map');
    
    if (!mapElement) {
        console.error('❌ Cannot add marker: map element not found');
        return;
    }
    
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.textContent = '🎃';
    marker.style.left = xPercent + '%';
    marker.style.top = yPercent + '%';
    marker.style.transform = 'translate(-50%, -50%)';
    
    const markerId = id || Date.now().toString();
    
    // Add click handler to remove marker
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Remove this marker?')) {
            removeMarker(xPercent, yPercent, markerId).catch(console.error);
        }
    });
    
    mapElement.appendChild(marker);
    markers.push({ x: xPercent, y: yPercent, element: marker, id: markerId });
    
    console.log('🎃 Added marker at', Math.round(xPercent) + '%,', Math.round(yPercent) + '%');
    
    if (save) {
        saveMarkers(markerId, xPercent, yPercent).catch(console.error);
    }
}

// Add a marker to Google Maps
function addGoogleMarker(lat, lng, id = null, save = true) {
    if (!googleMap) return;
    
    const markerId = id || Date.now().toString();
    
    const marker = new google.maps.Marker({
        position: { lat, lng },
        map: googleMap,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="0" y="30" font-size="32">🎃</text></svg>'
            ),
            scaledSize: new google.maps.Size(40, 40)
        }
    });
    
    marker.addListener('click', () => {
        if (confirm('Remove this marker?')) {
            removeGoogleMarker(lat, lng, markerId, marker);
        }
    });
    
    googleMarkers.push({ lat, lng, marker, id: markerId });
    
    if (save) {
        saveMarkers(markerId, null, null, lat, lng).catch(console.error);
    }
}

// Transfer markers between views
function transferMarkersToGoogleMap() {
    googleMarkers.forEach(m => m.marker.setMap(null));
    googleMarkers = [];
    
    markers.forEach(m => {
        // Convert percentage to lat/lng using conversion constants
        const lat = GOOGLE_MAPS_CONFIG.center.lat + ((m.y - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LAT_SCALE);
        const lng = GOOGLE_MAPS_CONFIG.center.lng + ((m.x - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LNG_SCALE);
        addGoogleMarker(lat, lng, m.id, false);
    });
}

function transferMarkersToGrid() {
    markers.forEach(m => m.element.remove());
    markers = [];
    
    googleMarkers.forEach(m => {
        // Convert lat/lng back to percentage using conversion constants
        const x = COORD_CONVERSION.CENTER_OFFSET + ((m.lng - GOOGLE_MAPS_CONFIG.center.lng) * COORD_CONVERSION.LNG_SCALE);
        const y = COORD_CONVERSION.CENTER_OFFSET + ((m.lat - GOOGLE_MAPS_CONFIG.center.lat) * COORD_CONVERSION.LAT_SCALE);
        addMarker(x, y, false, m.id);
    });
}

// Remove a specific marker
async function removeMarker(xPercent, yPercent, markerId) {
    const index = markers.findIndex(m => m.id === markerId);
    
    if (index !== -1) {
        markers[index].element.remove();
        markers.splice(index, 1);
        
        if (useApi && apiClient) {
            await deleteMarkerFromApi(markerId);
        } else {
            saveMarkersLocal();
        }
    }
}

async function removeGoogleMarker(lat, lng, markerId, markerObj) {
    const index = googleMarkers.findIndex(m => m.id === markerId);
    
    if (index !== -1) {
        googleMarkers[index].marker.setMap(null);
        googleMarkers.splice(index, 1);
        
        if (useApi && apiClient) {
            await deleteMarkerFromApi(markerId);
        } else {
            saveMarkersLocal();
        }
    }
}

// Toggle add marker mode
function toggleAddMarkerMode(active) {
    addingMarkerMode = active;
    const btn = document.getElementById('addMarkerBtn');
    const mapElement = document.getElementById('map');
    
    if (active) {
        btn.classList.add('active');
        btn.textContent = '📍 Click on Map to Place Marker';
        mapElement.classList.add('adding-marker');
    } else {
        btn.classList.remove('active');
        btn.textContent = '📍 Mark My House';
        mapElement.classList.remove('adding-marker');
    }
}

// Save markers to API or localStorage
async function saveMarkers(markerId, xPercent, yPercent, lat, lng) {
    if (useApi && apiClient) {
        const markerData = {
            id: markerId,
            timestamp: new Date().toISOString()
        };
        
        if (lat !== undefined && lng !== undefined) {
            markerData.lat = lat;
            markerData.lng = lng;
        } else {
            markerData.x = xPercent;
            markerData.y = yPercent;
        }
        
        await saveMarkerToApi(markerData);
    } else {
        saveMarkersLocal();
    }
}

function saveMarkersLocal() {
    try {
        const markerData = markers.map(m => ({ x: m.x, y: m.y, id: m.id }));
        localStorage.setItem('trickortreatMarkers', JSON.stringify(markerData));
        console.log('💾 Saved', markerData.length, 'markers to localStorage');
    } catch (error) {
        console.error('❌ Failed to save markers to localStorage:', error);
    }
}

// localStorage helper functions for API fallback
function saveMarkerToStorage(marker) {
    try {
        const stored = JSON.parse(localStorage.getItem('trickortreatMarkers') || '[]');
        // Remove existing marker with same ID
        const filtered = stored.filter(m => m.id !== marker.id);
        filtered.push(marker);
        localStorage.setItem('trickortreatMarkers', JSON.stringify(filtered));
        console.log('💾 Saved marker to localStorage fallback');
    } catch (error) {
        console.error('❌ Failed to save marker to localStorage:', error);
    }
}

function deleteMarkerFromStorage(markerId) {
    try {
        const stored = JSON.parse(localStorage.getItem('trickortreatMarkers') || '[]');
        const filtered = stored.filter(m => m.id !== markerId);
        localStorage.setItem('trickortreatMarkers', JSON.stringify(filtered));
        console.log('💾 Deleted marker from localStorage fallback');
    } catch (error) {
        console.error('❌ Failed to delete marker from localStorage:', error);
    }
}

function loadMarkersFromStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem('trickortreatMarkers') || '[]');
        syncMarkersFromApi(stored);
        console.log('💾 Loaded markers from localStorage fallback');
    } catch (error) {
        console.error('❌ Failed to load markers from localStorage:', error);
    }
}

// Load markers from localStorage
function loadMarkers() {
    const saved = localStorage.getItem('trickortreatMarkers');
    if (saved) {
        try {
            const markerData = JSON.parse(saved);
            console.log('📍 Loading', markerData.length, 'markers from localStorage');
            markerData.forEach(m => addMarker(m.x, m.y, false, m.id || Date.now().toString()));
        } catch (e) {
            console.error('❌ Error loading markers:', e);
        }
    } else {
        console.log('ℹ️ No saved markers found in localStorage');
    }
}

// Clear all markers
function clearAllMarkers() {
    const totalMarkers = isGoogleMapView ? googleMarkers.length : markers.length;
    
    if (totalMarkers === 0) {
        alert('No markers to clear!');
        return;
    }
    
    if (confirm('Are you sure you want to remove all markers? This action cannot be undone.')) {
        if (isGoogleMapView) {
            googleMarkers.forEach(m => m.marker.setMap(null));
            googleMarkers = [];
        } else {
            markers.forEach(m => m.element.remove());
            markers = [];
        }
        
        if (useFirebase && database) {
            database.ref('markers').remove();
        } else {
            saveMarkersLocal();
        }
    }
}

// Zoom in
function zoomIn() {
    if (zoomLevel < 2) {
        zoomLevel += 0.2;
        applyZoom();
    }
}

// Zoom out
function zoomOut() {
    if (zoomLevel > 0.5) {
        zoomLevel -= 0.2;
        applyZoom();
    }
}

// Apply zoom transformation
function applyZoom() {
    const mapElement = document.getElementById('map');
    mapElement.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
}

// Drag functionality
function startDrag(e) {
    if (addingMarkerMode) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyZoom();
}

function endDrag() {
    isDragging = false;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    
    document.getElementById('addMarkerBtn').addEventListener('click', () => {
        toggleAddMarkerMode(!addingMarkerMode);
    });
    
    document.getElementById('toggleMapBtn').addEventListener('click', toggleMapView);
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
});

// Global callback function is set dynamically when loading Google Maps API
