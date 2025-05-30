const axios = require('axios');

const SERVER_URL = 'http://localhost:3002';

async function testContextualResolve() {
    console.log('=== Testing Contextual Dependency Resolution ===\n');
    
    try {
        console.log('Testing Run 2 (P1_L1) which depends on "rollingtire_brake_trac":');
        console.log('Expected: Should find dependency ONLY in P1_L1 folder, not other folders\n');
        
        const response = await axios.post(`${SERVER_URL}/api/resolve-job-dependencies`, {
            projectName: 'ac',
            protocol: 'MF62', 
            runNumber: 2  // Run 2 is in P1_L1 and depends on rollingtire_brake_trac
        });
        
        console.log('✅ Success:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('Response from server:', error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

testContextualResolve();
