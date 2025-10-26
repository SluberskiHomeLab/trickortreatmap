// Simple interactive map for trick-or-treat locations
// Firebase Configuration - Replace with your Firebase project credentials
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Google Maps Configuration
const GOOGLE_MAPS_CONFIG = {
    // Default location: Cartwright Ranch area (update with actual coordinates)
    center: { lat: 33.6846, lng: -117.8265 }, // Example: Irvine, CA area
    zoom: 16
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
        // Check if Firebase config is set
        if (FIREBASE_CONFIG.apiKey === "YOUR_FIREBASE_API_KEY") {
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
            if (isGoogleMapView) {
                addGoogleMarker(markerData.lat, markerData.lng, markerData.id, false);
            } else {
                addMarker(markerData.x, markerData.y, false, markerData.id);
            }
        });
    }
}

// Initialize the map
function initMap() {
    const mapElement = document.getElementById('map');
    
    // Initialize Firebase
    useFirebase = initFirebase();
    
    // Add street grid lines for visual interest
    createStreetGrid();
    
    // Load saved markers
    if (!useFirebase) {
        loadMarkers();
    }
    
    // Add event listeners
    mapElement.addEventListener('click', onMapClick);
    mapElement.addEventListener('mousedown', startDrag);
    mapElement.addEventListener('mousemove', drag);
    mapElement.addEventListener('mouseup', endDrag);
    mapElement.addEventListener('mouseleave', endDrag);
}

// Initialize Google Maps
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
    
    if (!googleMap) {
        alert("Google Maps not available. Please configure API key.");
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

// Create decorative street grid
function createStreetGrid() {
    const mapElement = document.getElementById('map');
    
    // Add horizontal streets
    for (let i = 1; i < 5; i++) {
        const street = document.createElement('div');
        street.className = 'street-line-h';
        street.style.top = (i * 20) + '%';
        mapElement.appendChild(street);
    }
    
    // Add vertical streets
    for (let i = 1; i < 5; i++) {
        const street = document.createElement('div');
        street.className = 'street-line-v';
        street.style.left = (i * 20) + '%';
        mapElement.appendChild(street);
    }
}

// Handle map clicks
function onMapClick(e) {
    if (!addingMarkerMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to percentage
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    addMarker(xPercent, yPercent);
    toggleAddMarkerMode(false);
}

// Add a marker to the map
function addMarker(xPercent, yPercent, save = true, id = null) {
    const mapElement = document.getElementById('map');
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
        // Convert percentage to lat/lng (rough approximation)
        const lat = GOOGLE_MAPS_CONFIG.center.lat + ((m.y - 50) / 1000);
        const lng = GOOGLE_MAPS_CONFIG.center.lng + ((m.x - 50) / 1000);
        addGoogleMarker(lat, lng, m.id, false);
    });
}

function transferMarkersToGrid() {
    markers.forEach(m => m.element.remove());
    markers = [];
    
    googleMarkers.forEach(m => {
        // Convert lat/lng back to percentage (rough approximation)
        const x = 50 + ((m.lng - GOOGLE_MAPS_CONFIG.center.lng) * 1000);
        const y = 50 + ((m.lat - GOOGLE_MAPS_CONFIG.center.lat) * 1000);
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
    const markerData = markers.map(m => ({ x: m.x, y: m.y, id: m.id }));
    localStorage.setItem('trickortreatMarkers', JSON.stringify(markerData));
}

// Load markers from localStorage
function loadMarkers() {
    const saved = localStorage.getItem('trickortreatMarkers');
    if (saved) {
        try {
            const markerData = JSON.parse(saved);
            markerData.forEach(m => addMarker(m.x, m.y, false, m.id || Date.now().toString()));
        } catch (e) {
            console.error('Error loading markers:', e);
        }
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
    
    document.getElementById('clearAllBtn').addEventListener('click', clearAllMarkers);
    document.getElementById('toggleMapBtn').addEventListener('click', toggleMapView);
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
});

// Make initGoogleMap available globally for Google Maps callback
window.initGoogleMap = initGoogleMap;
