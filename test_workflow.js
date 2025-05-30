const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDependencyResolution() {
  try {
    console.log('Testing dependency resolution workflow...\n');
    
    // Test with row 2 which has old_job dependency
    const projectName = 'ac';
    const protocol = 'MF62';
    const runNumber = 2;
    
    console.log(`Testing with: projectName=${projectName}, protocol=${protocol}, runNumber=${runNumber}`);    // First, test the get-row-data endpoint
    console.log('\n1. Testing /api/get-row-data endpoint...');
    const rowDataResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/get-row-data?protocol=${protocol}&runNumber=${runNumber}`,
      method: 'GET'
    });
    
    console.log('Row data response:', rowDataResponse);
    
    if (!rowDataResponse.success) {
      console.error('Failed to get row data');
      return;
    }
    
    // Test check-odb-file endpoint for the dependency
    if (rowDataResponse.data.old_job && rowDataResponse.data.old_job !== '-') {
      console.log('\n2. Testing /api/check-odb-file endpoint for dependency...');
      const odbCheckResponse = await makeRequest({
        hostname: 'localhost',
        port: 3001,
        path: `/api/check-odb-file?projectName=${projectName}&protocol=${protocol}&folderName=${rowDataResponse.data.p}_${rowDataResponse.data.l}&jobName=${rowDataResponse.data.old_job}`,
        method: 'GET'
      });
      
      console.log('ODB check response:', odbCheckResponse);
    }
    
    // Test the full dependency resolution
    console.log('\n3. Testing /api/resolve-job-dependencies endpoint...');
    const depResResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/resolve-job-dependencies',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { projectName, protocol, runNumber });
    
    console.log('Dependency resolution response:', depResResponse);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testDependencyResolution();
