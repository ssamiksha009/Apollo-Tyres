document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

function updateTestSummary() {
    fetch('/api/get-ftire-summary')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            const summaryContainer = document.getElementById('testSummary');
            summaryContainer.innerHTML = data.map(item => `
                <div class="summary-item">
                    <span class="test-name">${item.tests}:</span>
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

window.addEventListener('load', updateTestSummary);

document.getElementById('submitBtn').addEventListener('click', function() {
    const parameterData = {
        load1_kg: document.getElementById('l1').value,
        load2_kg: document.getElementById('l2').value,
        load3_kg: document.getElementById('l3').value,
        pressure1: document.getElementById('p1').value,  // Changed to pressure1
        speed_kmph: document.getElementById('vel').value,
        IA: document.getElementById('ia').value,
        SA: document.getElementById('sa').value,
        SR: document.getElementById('sr').value,
        width: document.getElementById('rimWidth').value,
        diameter: document.getElementById('rimDiameter').value
    };

    // Generate parameter file
    fetch('/api/generate-parameters', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(parameterData)
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Error generating parameter file');
        }
        console.log('Fetching FTire protocol file...');
        // Explicitly request ftire.xlsx
        return fetch('/api/read-protocol-excel', {
            headers: {
                'Referer': '/FTire.html'  // Ensure correct referer
            }
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error reading protocol file: ${response.statusText}`);
        }
        return response.arrayBuffer();
    })
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
                'VEL': document.getElementById('vel').value.trim() || null,
                'Vel': document.getElementById('vel').value.trim() || null,
                'vel': document.getElementById('vel').value.trim() || null,
                'SR': document.getElementById('sr').value.trim() || null,  // Added SR
                'SA': document.getElementById('sa').value.trim() || null,  // Added SA
                'IA': document.getElementById('ia').value.trim() || null   // Added IA
            };

            // Create new sheet with replacements
            const newSheet = jsonData.map(row => {
                if (!Array.isArray(row)) return row;
                return row.map(cell => {
                    if (cell === null || cell === undefined) return cell;
                    const cellStr = String(cell).trim();
                    
                    // Handle velocity cases
                    if (cellStr.toLowerCase() === 'vel') {
                        return document.getElementById('vel').value.trim();
                    }
                    
                    // Handle IA, SA, SR replacements including negative values
                    if (cellStr === 'IA' || cellStr === '-IA') {
                        const iaValue = parseFloat(document.getElementById('ia').value.trim());
                        return cellStr.startsWith('-') ? (-Math.abs(iaValue)).toString() : iaValue.toString();
                    }
                    
                    if (cellStr === 'SA' || cellStr === '-SA') {
                        const saValue = parseFloat(document.getElementById('sa').value.trim());
                        return cellStr.startsWith('-') ? (-Math.abs(saValue)).toString() : saValue.toString();
                    }
                    
                    if (cellStr === 'SR' || cellStr === '-SR') {
                        const srValue = parseFloat(document.getElementById('sr').value.trim());
                        return cellStr.startsWith('-') ? (-Math.abs(srValue)).toString() : srValue.toString();
                    }
                    
                    // Handle other direct replacements
                    return replacements[cellStr] || cell;
                });
            });

            const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
            XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
        });

        // Save modified workbook and insert into database
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
        if (!data.success) {
            throw new Error(data.message || 'Error saving file');
        }

        // Read the output file and extract data for database
        return fetch('/api/read-output-excel')
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
                const extractedData = [];

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    // Find header row with exact Excel column names
                    let headerRowIndex = jsonData.findIndex(row => 
                        row && Array.isArray(row) && row.includes('S.No')
                    );
                    
                    if (headerRowIndex === -1) {
                        console.error('Excel structure:', jsonData);
                        throw new Error('Invalid Excel format: Missing required headers');
                    }
                    
                    const headerRow = jsonData[headerRowIndex];
                    console.log('Found headers:', headerRow);

                    // Match exact Excel column names and order
                    const columns = {
                        runs: headerRow.indexOf('S.No'),
                        tests: headerRow.indexOf('Test'),
                        loads: headerRow.indexOf('Load (N)'),
                        pressure: headerRow.indexOf('IP (Kpa)'),
                        velocity: headerRow.indexOf('Speed (kmph)'),
                        longitudinalSlip: headerRow.indexOf('Longitudinal Slip (%)'),
                        slipAngle: headerRow.indexOf('Slip Angle (deg)'),
                        inclinationAngle: headerRow.indexOf('Inclination Angle (deg)'),
                        cleatOrientation: headerRow.indexOf('Cleat Orientation [w.r.t axial direction] (deg)')
                    };

                    // Extract data in exact order matching the database columns
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || !row[columns.runs]) continue;

                        // Clean up text fields to remove carriage returns and extra whitespace
                        extractedData.push({
                            number_of_runs: parseInt(row[columns.runs]) || 0,
                            tests: (row[columns.tests]?.toString() || '').replace(/\r\n/g, ' ').trim(),
                            loads: row[columns.loads]?.toString() || '',
                            inflation_pressure: row[columns.pressure]?.toString() || '',
                            test_velocity: row[columns.velocity]?.toString() || '',
                            longitudinal_slip: row[columns.longitudinalSlip]?.toString() || '',
                            slip_angle: row[columns.slipAngle]?.toString() || '',
                            inclination_angle: row[columns.inclinationAngle]?.toString() || '',
                            cleat_orientation: row[columns.cleatOrientation]?.toString() || ''
                        });
                    }
                });

                if (extractedData.length === 0) {
                    console.error('No data extracted from Excel file');
                    throw new Error('No valid data found in Excel file');
                }

                console.log('Extracted data:', extractedData); // Debug log

                // Store the extracted data
                return fetch('/api/store-ftire-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: extractedData })
                });
            });
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            throw new Error(data.message || 'Error storing data');
        }
        updateTestSummary();
        window.location.href = '/select.html';
    })
    .catch(error => {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.color = '#d9534f';
        errorMessage.textContent = error.message || 'Error processing file. Please try again.';
    });
});
