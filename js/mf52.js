document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

function updateTestSummary() {
    fetch('/api/get-test-summary')
        .then(response => response.json())
        .then(data => {
            const summaryContainer = document.getElementById('testSummary');
            summaryContainer.innerHTML = data.map(item => `
                <div class="summary-item">
                    <span class="test-name">${item.tests}:</span>
                    <span class="test-count">${item.count}</span>
                </div>
            `).join('');
        })
        .catch(error => console.error('Error fetching test summary:', error));
}

window.addEventListener('load', updateTestSummary);

document.getElementById('submitBtn').addEventListener('click', function() {
    const parameterData = {
        load1_kg: document.getElementById('l1').value,
        load2_kg: document.getElementById('l2').value,
        load3_kg: document.getElementById('l3').value,
        pressure2: document.getElementById('p2').value,  // Changed from pressure to pressure2
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
        // Request MF5pt2.xlsx specifically
        return fetch('/api/read-protocol-excel?file=MF5pt2.xlsx');  // Changed from MF6pt2.xlsx
    })
    .then(response => response.arrayBuffer())
    .then(data => {
        const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
        const outputWorkbook = XLSX.utils.book_new();
        
        workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            // Replace values in the sheet
            const replacements = {
                'P2': document.getElementById('p2').value.trim() || null,  // Match Excel P2
                'L1': document.getElementById('l1').value.trim() || null,
                'L2': document.getElementById('l2').value.trim() || null,
                'L3': document.getElementById('l3').value.trim() || null,
                'VEL': document.getElementById('vel').value.trim() || null,
                'Vel': document.getElementById('vel').value.trim() || null,  // Added for 'Vel' variant
                'vel': document.getElementById('vel').value.trim() || null,  // Added for 'vel' variant
            };

            const iaValue = document.getElementById('ia').value.trim();
            const srValue = document.getElementById('sr').value.trim();
            const saValue = document.getElementById('sa').value.trim();

            // Create new sheet with replacements
            const newSheet = jsonData.map(row => {
                if (!Array.isArray(row)) return row;
                return row.map(cell => {
                    if (cell === null || cell === undefined) return cell;
                    
                    const cellStr = String(cell).trim();

                    // Case-insensitive velocity check
                    if (cellStr.toLowerCase() === 'vel') {
                        return document.getElementById('vel').value.trim();
                    }

                    // Handle special values
                    if (cellStr === 'IA') return iaValue;
                    if (cellStr === '-IA') return (-Math.abs(parseFloat(iaValue))).toString();
                    if (cellStr === 'SR') return srValue;
                    if (cellStr === '-SR') return (-Math.abs(parseFloat(srValue))).toString();
                    if (cellStr === 'SA') return saValue;
                    if (cellStr === '-SA') return (-Math.abs(parseFloat(saValue))).toString();

                    // Handle direct replacements
                    if (replacements.hasOwnProperty(cellStr) && replacements[cellStr] !== null) {
                        return replacements[cellStr];
                    }
                    
                    return cell;
                });
            });

            const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
            XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
        });

        // Save modified workbook
        const excelBuffer = XLSX.write(outputWorkbook, { bookType: 'xlsx', type: 'array' });
        const formData = new FormData();
        formData.append('excelFile', new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        }), 'output.xlsx');

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

        // Read the output file to extract data
        return fetch('/api/read-output-excel')
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
                const extractedData = [];

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    // Find the header row
                    let headerRowIndex = jsonData.findIndex(row => 
                        row && row.includes('Number Of Tests'));
                    
                    if (headerRowIndex === -1) return;
                    
                    const headerRow = jsonData[headerRowIndex];
                    const columns = {
                        runs: headerRow.indexOf('Number Of Tests'),
                        tests: headerRow.indexOf('Tests'),
                        pressure: headerRow.indexOf('Inflation Pressure [PSI]'),
                        loads: headerRow.indexOf('Loads[Kg]'),
                        ia: headerRow.indexOf('Inclination Angle[°]'),
                        sa: headerRow.indexOf('Slip Angle[°]'),
                        sr: headerRow.indexOf('Slip Ratio [%]'),
                        velocity: headerRow.indexOf('Test Velocity [Kmph]')
                    };

                    // Extract data rows
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || !row[columns.runs]) continue;

                        extractedData.push({
                            number_of_runs: parseInt(row[columns.runs]),
                            tests: row[columns.tests]?.toString() || '',
                            inflation_pressure: row[columns.pressure]?.toString() || '',
                            loads: row[columns.loads]?.toString() || '',
                            inclination_angle: row[columns.ia]?.toString() || '',
                            slip_angle: row[columns.sa]?.toString() || '',
                            slip_ratio: row[columns.sr]?.toString() || '',
                            test_velocity: row[columns.velocity]?.toString() || ''
                        });
                    }
                });

                if (extractedData.length === 0) {
                    throw new Error('No valid data found in Excel file');
                }

                // Store the extracted data
                return fetch('/api/store-mf52-data', {
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
        // Update test summary and redirect
        updateTestSummary();
        window.location.href = '/select.html';
    })
    .catch(error => {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.style.color = '#d9534f';
        errorMessage.textContent = error.message || 'Error processing file. Please try again.';
    });
});
