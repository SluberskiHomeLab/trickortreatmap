// Test script for the local API server
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

async function testApi() {
    console.log('🧪 Testing Trick or Treat Map Local API...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health check...');
        const health = await fetch(`${BASE_URL}/health`);
        const healthData = await health.json();
        console.log('✅ Health check:', healthData.status);
        
        // Test 2: Get markers (should be empty initially)
        console.log('\n2. Testing get markers...');
        const markers = await fetch(`${BASE_URL}/markers`);
        const markersData = await markers.json();
        console.log('✅ Markers retrieved:', markersData.markers.length, 'markers found');
        
        // Test 3: Create a marker
        console.log('\n3. Testing create marker...');
        const newMarker = {
            id: 'test-marker-' + Date.now(),
            x: 50.5,
            y: 25.8
        };
        
        const createResponse = await fetch(`${BASE_URL}/markers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMarker)
        });
        const createData = await createResponse.json();
        console.log('✅ Marker created:', createData.action, createData.marker.id);
        
        // Test 4: Get markers again (should now have 1)
        console.log('\n4. Testing get markers after creation...');
        const markersAfter = await fetch(`${BASE_URL}/markers`);
        const markersAfterData = await markersAfter.json();
        console.log('✅ Markers after creation:', markersAfterData.markers.length, 'markers found');
        
        // Test 5: Update the marker
        console.log('\n5. Testing update marker...');
        const updatedMarker = { ...newMarker, x: 75.2, y: 40.1 };
        const updateResponse = await fetch(`${BASE_URL}/markers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMarker)
        });
        const updateData = await updateResponse.json();
        console.log('✅ Marker updated:', updateData.action, 'new position:', updatedMarker.x, updatedMarker.y);
        
        // Test 6: Get statistics
        console.log('\n6. Testing statistics...');
        const stats = await fetch(`${BASE_URL}/stats`);
        const statsData = await stats.json();
        console.log('✅ Statistics:', statsData.stats);
        
        // Test 7: Delete the marker
        console.log('\n7. Testing delete marker...');
        const deleteResponse = await fetch(`${BASE_URL}/markers?id=${newMarker.id}`, {
            method: 'DELETE'
        });
        const deleteData = await deleteResponse.json();
        console.log('✅ Marker deleted:', deleteData.success, deleteData.deletedId);
        
        // Test 8: Verify deletion
        console.log('\n8. Testing markers after deletion...');
        const markersEnd = await fetch(`${BASE_URL}/markers`);
        const markersEndData = await markersEnd.json();
        console.log('✅ Final marker count:', markersEndData.markers.length);
        
        console.log('\n🎉 All API tests passed! Your local server is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🚨 Make sure the server is running:');
        console.log('   npm install');
        console.log('   npm run init-db');
        console.log('   npm start');
    }
}

// Run tests
if (require.main === module) {
    testApi();
}

module.exports = { testApi };