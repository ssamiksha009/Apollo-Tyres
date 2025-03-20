// Add at the beginning of the file
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

// Call when page loads
window.addEventListener('load', updateTestSummary);

// Submit button handling
document.getElementById('submitBtn').addEventListener('click', function() {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = '';
    
    // Check if all inputs are filled and valid
    const inputs = document.querySelectorAll('input[required]');
    let allValid = true;
    
    inputs.forEach(input => {
        if (!input.value || !input.checkValidity()) {
            allValid = false;
            input.classList.add('invalid');
        } else {
            input.classList.remove('invalid');
        }
    });

    if (!allValid) {
        errorMessage.textContent = '* All fields are mandatory and must be positive numbers';
        errorMessage.style.display = 'block'; // Make sure it's visible
        return;
    }

    // Make a request to the server to read the Excel file
    fetch('/api/read-protocol-excel')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
            
            // Process each sheet
            const outputWorkbook = XLSX.utils.book_new();
            
            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                
                // Replace values in the sheet
                const replacements = {
                    'P1': document.getElementById('p1').value.trim() || null,
                    'P2': document.getElementById('p2').value.trim() || null,
                    'P3': document.getElementById('p3').value.trim() || null,
                    'L1': document.getElementById('l1').value.trim() || null,
                    'L2': document.getElementById('l2').value.trim() || null,
                    'L3': document.getElementById('l3').value.trim() || null,
                    'VEL': document.getElementById('vel').value.trim() || null,
                };

                const iaValue = document.getElementById('ia').value.trim();
                const srValue = document.getElementById('sr').value.trim();
                const saValue = document.getElementById('sa').value.trim();

                // Create a new sheet while preserving all original data
                const newSheet = jsonData.map(row => {
                    if (!Array.isArray(row)) return row;
                    return row.map((cell, columnIndex) => {
                        if (cell === null || cell === undefined) return cell;
                        
                        const cellStr = String(cell).trim();

                        // Handle IA replacements
                        if (cellStr === 'IA') {
                            return iaValue;
                        }
                        if (cellStr === '-IA') {
                            return (-Math.abs(parseFloat(iaValue))).toString();
                        }

                        // Handle SR replacements
                        if (cellStr === 'SR') {
                            return srValue;
                        }
                        if (cellStr === '-SR') {
                            return (-Math.abs(parseFloat(srValue))).toString();
                        }

                        // Handle SA replacements
                        if (cellStr === 'SA') {
                            return saValue;
                        }
                        if (cellStr === '-SA') {
                            return (-Math.abs(parseFloat(saValue))).toString();
                        }

                        // Handle Load combinations
                        if (cellStr === 'L1,L2,L3' || 
                            (cellStr.includes('L1') && cellStr.includes('L2') && cellStr.includes('L3'))) {
                            const parts = cellStr.split(',');
                            const newParts = parts.map(part => {
                                const trimmed = part.trim();
                                return replacements[trimmed] !== null ? replacements[trimmed] : trimmed;
                            });
                            return newParts.join(',');
                        }
                        
                        // Handle Velocities
                        if (cellStr.toLowerCase() === 'vel') {
                            return replacements['VEL'];
                        }

                        // Handle other direct replacements
                        if (replacements.hasOwnProperty(cellStr) && replacements[cellStr] !== null) {
                            return replacements[cellStr];
                        }
                        
                        // Return original value for all other cells
                        return cell;
                    });
                });

                // Convert the modified data back to a worksheet
                const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
                
                // Add the modified sheet to the output workbook
                XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
            });

            // Instead of downloading, send to server
            const excelBuffer = XLSX.write(outputWorkbook, { bookType: 'xlsx', type: 'array' });
            
            // Create form data to send
            const formData = new FormData();
            formData.append('excelFile', new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'output.xlsx');

            // Send to server
            fetch('/api/save-excel', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Error saving file');
                }

                // Read the output file
                return fetch('/api/read-output-excel');
            })
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
                const extractedData = [];
                // Rest of the data extraction logic remains the same
                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                    
                    // Find the header row that contains "Number Of Tests"
                    let headerRowIndex = -1;
                    for(let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if(row && row.some(cell => 
                            cell && typeof cell === 'string' && 
                            cell === 'Number Of Tests')) {  // Changed to exact match
                            headerRowIndex = i;
                            break;
                        }
                    }
                    
                    if (headerRowIndex === -1) {
                        console.error('Could not find header row with "Number Of Tests"');
                        return;
                    }
                    
                    const headerRow = jsonData[headerRowIndex];
                    const getColumnIndex = (header) => {
                        return headerRow.findIndex(col => 
                            col && typeof col === 'string' && 
                            col === header  // Changed to exact match
                        );
                    };

                    // Update column mapping to exact header names
                    const columns = {
                        runs: getColumnIndex('Number Of Tests'),
                        tests: getColumnIndex('Tests'),
                        ips: getColumnIndex('Inflation Pressure [PSI]'),
                        loads: getColumnIndex('Loads[Kg]'),
                        ias: getColumnIndex('Inclination Angle[°]'),
                        sa: getColumnIndex('Slip Angle[°]'),
                        sr: getColumnIndex('Slip Ratio [%]'),
                        velocity: getColumnIndex('Test Velocity [Kmph]')
                    };

                    // Debug log to check column indices
                    console.log('Found columns:', columns);

                    // Verify all required columns were found
                    if (Object.values(columns).some(idx => idx === -1)) {
                        console.error('Missing required columns:', 
                            Object.entries(columns)
                                .filter(([key, value]) => value === -1)
                                .map(([key]) => key)
                        );
                        return;
                    }

                    // Extract data rows starting from the row after headers
                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        // Skip empty rows or rows without a run number
                        if (!row || !row[columns.runs]) continue;
                        
                        const runNumber = parseInt(row[columns.runs]);
                        // Only process rows with valid run numbers
                        if (!isNaN(runNumber)) {
                            extractedData.push({
                                number_of_runs: runNumber,
                                tests: row[columns.tests]?.toString() || '',
                                ips: row[columns.ips]?.toString() || '',
                                loads: row[columns.loads]?.toString() || '',
                                ias: row[columns.ias]?.toString() || '',
                                sa_range: row[columns.sa]?.toString() || '',
                                sr_range: row[columns.sr]?.toString() || '',
                                test_velocity: row[columns.velocity]?.toString() || ''
                            });
                        }
                    }
                });

                // Only proceed if we found data to save
                if (extractedData.length === 0) {
                    throw new Error('No valid data found in Excel file');
                }

                // Send extracted data to server
                return fetch('/api/store-excel-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data: extractedData })
                });
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Error storing data');
                }

                // After storing data, directly redirect
                updateTestSummary();
                window.location.href = '/select.html';
            })
            .catch(error => {
                errorMessage.style.color = '#d9534f';
                errorMessage.textContent = error.message || 'Error processing file. Please try again.';
            });
        })
        .catch(error => {
            errorMessage.style.color = '#d9534f';
            errorMessage.textContent = error.message || 'Error reading file. Please try again.';
        });
});