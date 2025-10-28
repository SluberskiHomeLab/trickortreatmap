// Quick debug test for the API endpoints
console.log('🔍 Testing API endpoints...');

const testEndpoints = [
    'http://localhost:3001/api/health',
    'http://localhost:3001/api/markers',
    'http://localhost:3001/api/settings',
    'http://localhost:3001/api/stats'
];

async function testApi() {
    console.log('Testing API endpoints:');
    
    for (const url of testEndpoints) {
        try {
            console.log(`\n🌐 Testing: ${url}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ SUCCESS:', response.status);
                console.log('📄 Response:', JSON.stringify(data, null, 2));
            } else {
                console.log('❌ FAILED:', response.status);
                console.log('📄 Error:', JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.log('❌ CONNECTION ERROR:', error.message);
            console.log('💡 Is the server running? Try: npm start');
        }
    }
}

// Test if we're in a browser or Node.js
if (typeof window !== 'undefined') {
    // Browser version
    testApi().then(() => console.log('\n✅ Browser tests complete'));
} else {
    // Node.js version - need to install node-fetch first
    console.log('❌ This test needs to run in a browser or with node-fetch installed');
    console.log('💡 Open browser console and paste this script');
    console.log('💡 Or install node-fetch: npm install node-fetch');
}

// Export for browser use
if (typeof window !== 'undefined') {
    window.testTrickOrTreatAPI = testApi;
}