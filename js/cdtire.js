// Copy ftire.js content and replace all instances of 'ftire' with 'cdtire' in the API endpoints

document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

document.getElementById('submitBtn').addEventListener('click', function() {
    const parameterData = {
        load1_kg: document.getElementById('l1').value,
        load2_kg: document.getElementById('l2').value,
        load3_kg: document.getElementById('l3').value,
        load4_kg: document.getElementById('l4').value,
        load5_kg: document.getElementById('l5').value,
        pressure1: document.getElementById('p1').value,
        speed_kmph: document.getElementById('vel').value,
        IA: document.getElementById('ia').value,
        SR: document.getElementById('sr').value,
        width: document.getElementById('rimWidth').value,
        diameter: document.getElementById('rimDiameter').value
    };

    // Generate parameter file first
    fetch('/api/generate-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameterData)
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.message);
        return fetch('/api/read-protocol-excel', {
            headers: { 'Referer': '/cdtire.html' }
        });
    })
    .then(response => response.arrayBuffer())
    .then(data => {
        const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
        const outputWorkbook = XLSX.utils.book_new();
        
        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
              const replacements = {
                'P1': document.getElementById('p1').value.trim() || null,
                'L1': document.getElementById('l1').value.trim() || null,
                'L2': document.getElementById('l2').value.trim() || null,
                'L3': document.getElementById('l3').value.trim() || null,
                'L4': document.getElementById('l4').value.trim() || null,
                'L5': document.getElementById('l5').value.trim() || null,
                'VEL': document.getElementById('vel').value.trim() || null,
                'SR': document.getElementById('sr').value.trim() || null,
                'IA': document.getElementById('ia').value.trim() || null
            };

            const newSheet = jsonData.map((row, rowIndex) => {
                if (!Array.isArray(row)) return row;
                
                // Store original P and L values for this row
                const originalPValues = [];
                const originalLValues = [];
                
                const modifiedRow = row.map(cell => {
                    if (!cell) return cell;
                    const cellStr = String(cell).trim();                    // Store original P values before replacement
                    if (cellStr.match(/^P[1-3]$/) || cellStr.toLowerCase() === 'ipref') {
                        originalPValues.push(cellStr);
                    }
                    
                    // Store original L values before replacement
                    if (cellStr.match(/^L[1-5]$/)) {
                        originalLValues.push(cellStr);
                    }
                    
                    // Handle velocity cases
                    if (cellStr.toLowerCase() === 'vel') {
                        return document.getElementById('vel').value.trim();
                    }
                    
                    // Handle IA replacements
                    if (cellStr === 'IA' || cellStr === '-IA') {
                        const iaValue = parseFloat(document.getElementById('ia').value.trim());
                        return cellStr.startsWith('-') ? (-Math.abs(iaValue)).toString() : iaValue.toString();
                    }
                    
                    // Handle SR replacements
                    if (cellStr === 'SR' || cellStr === '-SR') {
                        const srValue = parseFloat(document.getElementById('sr').value.trim());
                        return cellStr.startsWith('-') ? (-Math.abs(srValue)).toString() : srValue.toString();
                    }
                      // Handle P1 case-insensitively and also replace IPref with P1
                    if (cellStr.toLowerCase() === 'p1' || cellStr.toLowerCase() === 'ipref') {
                        return document.getElementById('p1').value.trim();
                    }
                    
                    // Handle other replacements
                    return replacements[cellStr] || cell;
                });
                
                // Find the actual end of the row (last non-empty cell + 1)
                let lastDataIndex = modifiedRow.length - 1;
                while (lastDataIndex >= 0 && (modifiedRow[lastDataIndex] === null || modifiedRow[lastDataIndex] === undefined || modifiedRow[lastDataIndex] === '')) {
                    lastDataIndex--;
                }
                
                // Extend row to ensure we have space for new columns
                const extendedRow = [...modifiedRow];
                while (extendedRow.length <= lastDataIndex + 2) {
                    extendedRow.push('');
                }
                
                // Add original P and L values in completely new columns at the end
                if (rowIndex === 0) {
                    extendedRow[lastDataIndex + 1] = 'Original P Values';
                    extendedRow[lastDataIndex + 2] = 'Original L Values';
                } else {
                    extendedRow[lastDataIndex + 1] = originalPValues.join(', ');
                    extendedRow[lastDataIndex + 2] = originalLValues.join(', ');
                }
                
                return extendedRow;
            });

            const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
            XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
        });

        const excelBuffer = XLSX.write(outputWorkbook, { bookType: 'xlsx', type: 'array' });
        const formData = new FormData();
        formData.append('excelFile', new Blob([excelBuffer]), 'output.xlsx');

        return fetch('/api/save-excel', {
            method: 'POST',
            body: formData
        });
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.message);
        return fetch('/api/read-output-excel');
    })
    .then(response => response.arrayBuffer())
    .then(data => {
        const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
        const extractedData = [];

        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            let headerRowIndex = jsonData.findIndex(row => 
                row && Array.isArray(row) && row.includes('No of Tests')
            );
            
            if (headerRowIndex === -1) {
                throw new Error('Invalid Excel format: Missing required headers');
            }
            
            const headerRow = jsonData[headerRowIndex];
            
            const columns = {
                runs: headerRow.indexOf('No of Tests'),
                testName: headerRow.indexOf('Test Name'),
                pressure: headerRow.indexOf('Inflation Pressure [bar]'),
                velocity: headerRow.indexOf('Velocity [km/h]'),
                preload: headerRow.indexOf('Preload [N]'),
                camber: headerRow.indexOf('Camber [Deg]'),
                slipAngle: headerRow.indexOf('Slip Angle [deg]'),
                displacement: headerRow.indexOf('Displacement [mm]'),
                slipRange: headerRow.indexOf('Slip range [%]'),
                cleat: headerRow.indexOf('Cleat'),
                roadSurface: headerRow.indexOf('Road Surface'),
                job: headerRow.indexOf('Job'),
                old_job: headerRow.indexOf('Old Job')
            };

            // P and L columns are positioned right after Old Job column
            const pColumnIndex = columns.old_job >= 0 ? columns.old_job + 1 : -1;
            const lColumnIndex = columns.old_job >= 0 ? columns.old_job + 2 : -1;

            console.log('Found column indices:', columns);
            console.log('P column index:', pColumnIndex, 'L column index:', lColumnIndex);

            // Verify only required columns were found - exclude the new optional columns from missing check
            const requiredColumns = ['runs', 'testName', 'pressure', 'velocity', 'preload', 'camber', 'slipAngle', 'displacement', 'slipRange', 'cleat', 'roadSurface'];
            const missingColumns = requiredColumns.filter(key => columns[key] === -1);
            
            if (missingColumns.length > 0) {
                console.error('Missing columns:', missingColumns);
                console.log('Available headers:', headerRow);
                throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
            }

            // Extract data in correct order
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || !row[columns.runs]) continue;

                // Clean and validate each value
                const cleanValue = (val) => val?.toString().trim().replace(/\n/g, ' ') || '';

                extractedData.push({
                    number_of_runs: parseInt(row[columns.runs]) || 0,
                    test_name: cleanValue(row[columns.testName]),
                    inflation_pressure: cleanValue(row[columns.pressure]),
                    velocity: cleanValue(row[columns.velocity]),
                    preload: cleanValue(row[columns.preload]),
                    camber: cleanValue(row[columns.camber]),
                    slip_angle: cleanValue(row[columns.slipAngle]),
                    displacement: cleanValue(row[columns.displacement]),
                    slip_range: cleanValue(row[columns.slipRange]),
                    cleat: cleanValue(row[columns.cleat]),
                    road_surface: cleanValue(row[columns.roadSurface]),
                    job: columns.job >= 0 ? cleanValue(row[columns.job]) : '',
                    old_job: columns.old_job >= 0 ? cleanValue(row[columns.old_job]) : '',
                    p: pColumnIndex >= 0 ? cleanValue(row[pColumnIndex]) : '',
                    l: lColumnIndex >= 0 ? cleanValue(row[lColumnIndex]) : ''
                });
            }
        });

        if (extractedData.length === 0) {
            throw new Error('No valid data found in Excel file');
        }

        return fetch('/api/store-cdtire-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: extractedData })
        });
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) throw new Error(data.message);
        updateTestSummary();
        window.location.href = '/select.html';
    })
    .catch(error => {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.color = '#d9534f';
        errorMessage.textContent = error.message || 'Error processing file. Please try again.';
    });
});

function updateTestSummary() {
    fetch('/api/get-cdtire-summary')
        .then(response => {
            if (!response.ok) {
                console.error('Summary response status:', response.status);
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Summary data received:', data); // Debug log
            const summaryContainer = document.getElementById('testSummary');
            if (!data || data.length === 0) {
                summaryContainer.innerHTML = '<div class="summary-item">No tests available</div>';
                return;
            }
            
            summaryContainer.innerHTML = data.map(item => `
                <div class="summary-item">
                    <span class="test-name">${item.test_name || 'Unknown'}:</span>
                    <span class="test-count">${item.count}</span>
                </div>
            `).join('');
        })
        .catch(error => {
            console.error('Error fetching test summary:', error);
            const summaryContainer = document.getElementById('testSummary');
            summaryContainer.innerHTML = '<div class="error-message">Unable to load test summary</div>';
        });
}

// Call when page loads
window.addEventListener('load', updateTestSummary);

// ...rest of the code from ftire.js but with 'cdtire' endpoints...
