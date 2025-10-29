// Reverse Proxy & Marker Debugging Script
// Run this in the browser console to diagnose issues

console.log('🔍 DEBUGGING REVERSE PROXY & MARKER ISSUES');
console.log('=' .repeat(50));

// 1. Check Current Location and Config
console.log('📍 Current Location Info:');
console.log('  Protocol:', window.location.protocol);
console.log('  Host:', window.location.host);
console.log('  Hostname:', window.location.hostname);
console.log('  Port:', window.location.port);
console.log('  Origin:', window.location.origin);
console.log('  Pathname:', window.location.pathname);

// 2. Check Configuration
console.log('\n📋 Configuration Check:');
if (window.CONFIG) {
    console.log('  ✅ CONFIG object exists');
    console.log('  API Base URL:', window.CONFIG.api.baseUrl);
    console.log('  API Endpoints:', window.CONFIG.api.endpoints);
} else {
    console.log('  ❌ CONFIG object missing - config.js not loaded?');
}

// 3. Check API Client
console.log('\n🔌 API Client Check:');
if (window.apiClient) {
    console.log('  ✅ API Client exists');
    console.log('  Base URL:', window.apiClient.baseUrl);
} else {
    console.log('  ❌ API Client not initialized');
}

// 4. Test API Endpoints
console.log('\n🌐 Testing API Endpoints...');

async function testApiEndpoints() {
    const baseUrl = window.CONFIG?.api?.baseUrl || '';
    const endpoints = [
        '/api/health',
        '/api/markers',
        '/api/settings',
        '/api/stats'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const url = baseUrl + endpoint;
            console.log(`\n🧪 Testing: ${url}`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            console.log(`  Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('  ✅ SUCCESS');
                console.log('  Response:', JSON.stringify(data, null, 2));
            } else {
                console.log('  ❌ FAILED');
                const errorText = await response.text();
                console.log('  Error:', errorText);
            }
        } catch (error) {
            console.log(`  ❌ NETWORK ERROR: ${error.message}`);
        }
    }
}

// 5. Test Marker Operations
async function testMarkerOperations() {
    console.log('\n📍 Testing Marker Operations...');
    
    if (!window.apiClient) {
        console.log('❌ Cannot test markers - API client not available');
        return;
    }
    
    try {
        // Test GET markers
        console.log('🧪 Testing GET /api/markers...');
        const markers = await window.apiClient.get('/api/markers');
        console.log('✅ GET markers success:', markers);
        
        // Test POST marker
        console.log('🧪 Testing POST /api/markers...');
        const testMarker = {
            id: 'debug-test-' + Date.now(),
            x: 50,
            y: 50,
            lat: 33.6846,
            lng: -117.8265,
            timestamp: new Date().toISOString()
        };
        
        const createResult = await window.apiClient.post('/api/markers', testMarker);
        console.log('✅ POST marker success:', createResult);
        
        // Test DELETE marker
        console.log('🧪 Testing DELETE /api/markers...');
        const deleteResult = await window.apiClient.delete('/api/markers', testMarker.id);
        console.log('✅ DELETE marker success:', deleteResult);
        
    } catch (error) {
        console.log('❌ Marker operation failed:', error.message);
    }
}

// 6. Check Local Storage
console.log('\n💾 Local Storage Check:');
try {
    const localMarkers = localStorage.getItem('trickortreat-markers');
    if (localMarkers) {
        const parsed = JSON.parse(localMarkers);
        console.log('  ✅ Local storage has', parsed.length, 'markers');
    } else {
        console.log('  📭 No markers in local storage');
    }
} catch (error) {
    console.log('  ❌ Local storage error:', error.message);
}

// 7. Check Network Tab
console.log('\n🌐 Network Check Instructions:');
console.log('1. Open DevTools Network tab');
console.log('2. Try adding a marker on the map');
console.log('3. Look for failed requests to /api/ endpoints');
console.log('4. Check request headers and CORS errors');

// Run the tests
console.log('\n🏃‍♂️ Running Tests...');
testApiEndpoints().then(() => {
    testMarkerOperations().then(() => {
        console.log('\n✅ All tests completed!');
        console.log('\n💡 Troubleshooting Tips:');
        console.log('- If API tests fail, check your reverse proxy configuration');
        console.log('- If CORS errors appear, verify server headers');
        console.log('- If 404 errors occur, check proxy path forwarding');
        console.log('- If markers don\'t persist, check database initialization');
    });
});

// Export test functions for manual use
window.debugTrickorTreat = {
    testApiEndpoints,
    testMarkerOperations,
    checkConfig: () => console.log(window.CONFIG),
    checkApiClient: () => console.log(window.apiClient)
};