const axios = require('axios');

const SERVER_URL = 'http://localhost:3002';

async function testDependencyLogic() {
    console.log('=== Testing P_L Folder Context Logic ===\n');
    
    try {
        // Check what Run 2 data looks like
        console.log('Step 1: Get Run 2 data...');
        const rowResponse = await axios.get(`${SERVER_URL}/api/get-row-data`, {
            params: {
                protocol: 'MF62',
                runNumber: 2
            }
        });
          console.log('Run 2 data:', rowResponse.data.data);
        const { p, l, job, old_job } = rowResponse.data.data;
        console.log(`Run 2: Job="${job}" depends on "${old_job}" in folder ${p}_${l}\n`);
        
        // Check if dependency ODB exists in same folder
        console.log('Step 2: Check if dependency ODB exists in same folder...');
        const odbResponse = await axios.get(`${SERVER_URL}/api/check-odb-file`, {
            params: {
                projectName: 'ac',
                protocol: 'MF62',
                folderName: `${p}_${l}`,
                jobName: old_job.replace('.inp', '').replace('.inp', '') // Clean name
            }
        });
        
        console.log('Dependency ODB check:', odbResponse.data);
          if (odbResponse.data.exists) {
            console.log('✅ SUCCESS: Dependency ODB found in correct folder!');
            console.log(`✅ CORRECT BEHAVIOR: System should use dependency from ${p}_${l}, not other folders`);
        } else {
            console.log('❌ Dependency ODB not found in expected folder');
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Error:', error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

testDependencyLogic();
