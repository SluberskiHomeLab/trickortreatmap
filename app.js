// Simple interactive map for trick-or-treat locations
let markers = [];
let addingMarkerMode = false;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// Initialize the map
function initMap() {
    const mapElement = document.getElementById('map');
    
    // Add street grid lines for visual interest
    createStreetGrid();
    
    // Load saved markers
    loadMarkers();
    
    // Add event listeners
    mapElement.addEventListener('click', onMapClick);
    mapElement.addEventListener('mousedown', startDrag);
    mapElement.addEventListener('mousemove', drag);
    mapElement.addEventListener('mouseup', endDrag);
    mapElement.addEventListener('mouseleave', endDrag);
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
function addMarker(xPercent, yPercent, save = true) {
    const mapElement = document.getElementById('map');
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.textContent = '🎃';
    marker.style.left = xPercent + '%';
    marker.style.top = yPercent + '%';
    marker.style.transform = 'translate(-50%, -50%)';
    
    // Add click handler to remove marker
    marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Remove this marker?')) {
            removeMarker(xPercent, yPercent);
        }
    });
    
    mapElement.appendChild(marker);
    markers.push({ x: xPercent, y: yPercent, element: marker });
    
    if (save) {
        saveMarkers();
    }
}

// Remove a specific marker
function removeMarker(xPercent, yPercent) {
    const index = markers.findIndex(m => 
        Math.abs(m.x - xPercent) < 0.1 && Math.abs(m.y - yPercent) < 0.1
    );
    
    if (index !== -1) {
        markers[index].element.remove();
        markers.splice(index, 1);
        saveMarkers();
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

// Save markers to localStorage
function saveMarkers() {
    const markerData = markers.map(m => ({ x: m.x, y: m.y }));
    localStorage.setItem('trickortreatMarkers', JSON.stringify(markerData));
}

// Load markers from localStorage
function loadMarkers() {
    const saved = localStorage.getItem('trickortreatMarkers');
    if (saved) {
        try {
            const markerData = JSON.parse(saved);
            markerData.forEach(m => addMarker(m.x, m.y, false));
        } catch (e) {
            console.error('Error loading markers:', e);
        }
    }
}

// Clear all markers
function clearAllMarkers() {
    if (markers.length === 0) {
        alert('No markers to clear!');
        return;
    }
    
    if (confirm('Are you sure you want to remove all markers? This action cannot be undone.')) {
        markers.forEach(m => m.element.remove());
        markers = [];
        saveMarkers();
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
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
});
