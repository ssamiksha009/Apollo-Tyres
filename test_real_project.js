const axios = require('axios');

const SERVER_URL = 'http://localhost:3002';

async function testRealProject() {
    console.log('=== Testing Real Project ac_MF62 ===\n');
    
    try {
        // Test dependency resolution on the real project that has ODB files
        console.log('Testing dependency resolution for real project ac_MF62:');
        
        const response = await axios.post(`${SERVER_URL}/api/resolve-job-dependencies`, {
            projectName: 'ac',
            protocol: 'MF62', 
            runNumber: 2  // This should depend on rollingtire_brake_trac from Run 1
        });
        
        console.log('✅ Success:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Error:', error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

async function testODBCheck() {
    console.log('\n=== Testing ODB File Check ===\n');
    
    try {
        // Check if ODB exists for the dependency job
        const response = await axios.get(`${SERVER_URL}/api/check-odb-file`, {
            params: {
                projectName: 'ac',
                protocol: 'MF62',
                folderName: 'P1_L1',
                jobName: 'rollingtire_brake_trac'  // Without .inp extension
            }
        });
        
        console.log('ODB check result:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Error:', error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

async function runTests() {
    await testODBCheck();
    await testRealProject();
}

runTests();
