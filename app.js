// Simple interactive map for trick-or-treat locations
// Configuration will be loaded from runtime config or fallback to placeholders

// Get configuration from runtime config (GitHub Actions) or fallback to placeholders
function getFirebaseConfig() {
    console.log('🔍 Checking runtime configuration...');
    console.log('window.RUNTIME_CONFIG exists:', !!window.RUNTIME_CONFIG);
    
    if (window.RUNTIME_CONFIG) {
        console.log('RUNTIME_CONFIG contents:', window.RUNTIME_CONFIG);
    }
    
    if (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.firebase && window.RUNTIME_CONFIG.firebase.apiKey && window.RUNTIME_CONFIG.firebase.apiKey !== '') {
        console.log('🔧 Using runtime Firebase configuration');
        console.log('Firebase API key starts with:', window.RUNTIME_CONFIG.firebase.apiKey.substring(0, 10) + '...');
        return window.RUNTIME_CONFIG.firebase;
    }
    
    console.log('⚠️ Using placeholder Firebase configuration (localStorage fallback)');
    return {
        apiKey: "PLACEHOLDER_FIREBASE_API_KEY",
        authDomain: "PLACEHOLDER_PROJECT_ID.firebaseapp.com",
        databaseURL: "https://PLACEHOLDER_PROJECT_ID-default-rtdb.firebaseio.com",
        projectId: "PLACEHOLDER_PROJECT_ID",
        storageBucket: "PLACEHOLDER_PROJECT_ID.appspot.com",
        messagingSenderId: "PLACEHOLDER_SENDER_ID",
        appId: "PLACEHOLDER_APP_ID"
    };
}

function getGoogleMapsApiKey() {
    if (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.googleMapsApiKey && window.RUNTIME_CONFIG.googleMapsApiKey !== '') {
        console.log('🔧 Using runtime Google Maps API key');
        console.log('Google Maps API key starts with:', window.RUNTIME_CONFIG.googleMapsApiKey.substring(0, 10) + '...');
        return window.RUNTIME_CONFIG.googleMapsApiKey;
    }
    
    console.log('⚠️ Using placeholder Google Maps API key');
    return "PLACEHOLDER_GOOGLE_MAPS_API_KEY";
}

// Set configuration
const FIREBASE_CONFIG = getFirebaseConfig();
const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// Google Maps Configuration
const GOOGLE_MAPS_CONFIG = {
    // Default location: Cartwright Ranch area (update with actual coordinates)
    center: { lat: 33.6846, lng: -117.8265 }, // Example: Irvine, CA area
    zoom: 16
};

// Expose configuration to window for debugging
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
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
let database = null;
let googleMap = null;
let googleMarkers = [];
let isGoogleMapView = false;
let useFirebase = false;

// Initialize Firebase
function initFirebase() {
    try {
        // Check if Firebase config is set (placeholder values indicate config not replaced)
        if (FIREBASE_CONFIG.apiKey === "PLACEHOLDER_FIREBASE_API_KEY" || FIREBASE_CONFIG.apiKey === "YOUR_FIREBASE_API_KEY") {
            console.warn("Firebase not configured. Using localStorage fallback.");
            showConfigNotice();
            return false;
        }
        
        firebase.initializeApp(FIREBASE_CONFIG);
        database = firebase.database();
        
        // Listen for marker changes
        database.ref('markers').on('value', (snapshot) => {
            const data = snapshot.val();
            syncMarkersFromFirebase(data);
        });
        
        return true;
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showConfigNotice();
        return false;
    }
}

function showConfigNotice() {
    const notice = document.getElementById('config-notice');
    if (notice) notice.style.display = 'block';
}

// Sync markers from Firebase
function syncMarkersFromFirebase(data) {
    // Clear existing markers
    markers.forEach(m => m.element.remove());
    markers = [];
    
    if (isGoogleMapView) {
        googleMarkers.forEach(m => m.setMap(null));
        googleMarkers = [];
    }
    
    // Add markers from Firebase
    if (data) {
        Object.values(data).forEach(markerData => {
            // Determine marker type based on available coordinates
            const hasLatLng = markerData.lat !== undefined && markerData.lng !== undefined;
            const hasXY = markerData.x !== undefined && markerData.y !== undefined;
            
            if (isGoogleMapView && hasLatLng) {
                addGoogleMarker(markerData.lat, markerData.lng, markerData.id, false);
            } else if (isGoogleMapView && hasXY) {
                // Convert grid coordinates to lat/lng for Google Maps
                const lat = GOOGLE_MAPS_CONFIG.center.lat + ((markerData.y - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LAT_SCALE);
                const lng = GOOGLE_MAPS_CONFIG.center.lng + ((markerData.x - COORD_CONVERSION.CENTER_OFFSET) / COORD_CONVERSION.LNG_SCALE);
                addGoogleMarker(lat, lng, markerData.id, false);
            } else if (!isGoogleMapView && hasXY) {
                addMarker(markerData.x, markerData.y, false, markerData.id);
            } else if (!isGoogleMapView && hasLatLng) {
                // Convert lat/lng to grid coordinates
                const x = COORD_CONVERSION.CENTER_OFFSET + ((markerData.lng - GOOGLE_MAPS_CONFIG.center.lng) * COORD_CONVERSION.LNG_SCALE);
                const y = COORD_CONVERSION.CENTER_OFFSET + ((markerData.lat - GOOGLE_MAPS_CONFIG.center.lat) * COORD_CONVERSION.LAT_SCALE);
                addMarker(x, y, false, markerData.id);
            }
        });
    }
}

// Initialize the map
function initMap() {
    console.log('🎃 Initializing Trick or Treat Map...');
    const mapElement = document.getElementById('map');
    
    if (!mapElement) {
        console.error('❌ Map element not found!');
        return;
    }
    
    // Initialize Firebase
    useFirebase = initFirebase();
    console.log('🔥 Firebase enabled:', useFirebase);
    
    // Setup neighborhood image
    setupNeighborhoodImage();
    
    // Load saved markers
    if (!useFirebase) {
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
            removeMarker(xPercent, yPercent, markerId);
        }
    });
    
    mapElement.appendChild(marker);
    markers.push({ x: xPercent, y: yPercent, element: marker, id: markerId });
    
    console.log('🎃 Added marker at', Math.round(xPercent) + '%,', Math.round(yPercent) + '%');
    
    if (save) {
        saveMarkers(markerId, xPercent, yPercent);
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
        saveMarkers(markerId, null, null, lat, lng);
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
function removeMarker(xPercent, yPercent, markerId) {
    const index = markers.findIndex(m => m.id === markerId);
    
    if (index !== -1) {
        markers[index].element.remove();
        markers.splice(index, 1);
        
        if (useFirebase && database) {
            database.ref('markers/' + markerId).remove();
        } else {
            saveMarkersLocal();
        }
    }
}

function removeGoogleMarker(lat, lng, markerId, markerObj) {
    const index = googleMarkers.findIndex(m => m.id === markerId);
    
    if (index !== -1) {
        googleMarkers[index].marker.setMap(null);
        googleMarkers.splice(index, 1);
        
        if (useFirebase && database) {
            database.ref('markers/' + markerId).remove();
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

// Save markers to Firebase or localStorage
function saveMarkers(markerId, xPercent, yPercent, lat, lng) {
    if (useFirebase && database) {
        const markerData = {
            id: markerId,
            timestamp: Date.now()
        };
        
        if (lat !== undefined && lng !== undefined) {
            markerData.lat = lat;
            markerData.lng = lng;
        } else {
            markerData.x = xPercent;
            markerData.y = yPercent;
        }
        
        database.ref('markers/' + markerId).set(markerData);
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
