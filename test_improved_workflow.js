const axios = require('axios');

const SERVER_URL = 'http://localhost:3002';

async function testImprovedDependencyResolution() {
    console.log('=== Testing Improved Dependency Resolution ===\n');
    
    try {
        // Test the specific case from our analysis:
        // Run 1 has job "rollingtire_brake_trac.inp"
        // Run 2 references old_job "rollingtire_brake_trac" (without .inp)
        
        const testCases = [
            {
                projectName: 'test_project',
                protocol: 'MF62',
                runNumber: 1,
                description: 'Run 1 - should handle job with .inp extension'
            },
            {
                projectName: 'test_project', 
                protocol: 'MF62',
                runNumber: 2,
                description: 'Run 2 - should resolve old_job without .inp extension'
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`\nTesting ${testCase.description}:`);
            console.log(`Project: ${testCase.projectName}, Protocol: ${testCase.protocol}, Run: ${testCase.runNumber}`);
            
            // First get the row data to see what we're working with
            try {
                const rowResponse = await axios.get(`${SERVER_URL}/api/get-row-data`, {
                    params: {
                        protocol: testCase.protocol,
                        runNumber: testCase.runNumber
                    }
                });
                
                console.log(`Row data:`, rowResponse.data);
                
                // Now test dependency resolution
                const depResponse = await axios.post(`${SERVER_URL}/api/resolve-job-dependencies`, {
                    projectName: testCase.projectName,
                    protocol: testCase.protocol,
                    runNumber: testCase.runNumber
                });
                
                console.log(`✅ Dependency resolution successful:`, depResponse.data);
                
            } catch (error) {
                if (error.response) {
                    console.log(`❌ Error:`, error.response.data);
                } else {
                    console.log(`❌ Network error:`, error.message);
                }
            }
        }
        
        console.log('\n=== Testing Job Name Variations ===\n');
        
        // Test the smart job matching directly
        const nameVariations = [
            'rollingtire_brake_trac',
            'rollingtire_brake_trac.inp'
        ];
        
        for (const jobName of nameVariations) {
            console.log(`\nTesting job name variation: "${jobName}"`);
            try {
                const response = await axios.get(`${SERVER_URL}/api/get-row-data`, {
                    params: {
                        protocol: 'MF62',
                        jobName: jobName
                    }
                });
                console.log(`✅ Found job:`, response.data);
            } catch (error) {
                if (error.response) {
                    console.log(`❌ Job not found:`, error.response.data);
                } else {
                    console.log(`❌ Network error:`, error.message);
                }
            }
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testImprovedDependencyResolution();
