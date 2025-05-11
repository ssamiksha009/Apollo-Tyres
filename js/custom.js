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
        errorMessage.style.display = 'block';
        return;
    }
    
    // Handle mesh file upload if provided
    const meshFile = document.getElementById('meshFile').files[0];
    if (meshFile) {
        const formData = new FormData();
        formData.append('meshFile', meshFile);
        
        // Upload the mesh file
        fetch('/api/upload-mesh-file', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Failed to upload mesh file');
            }
            // Continue with Excel processing after successful mesh file upload
            processCustomExcel();
        })
        .catch(error => {
            errorMessage.style.color = '#d9534f';
            errorMessage.textContent = error.message || 'Error uploading mesh file. Please try again.';
        });
    } else {
        // Proceed without mesh file upload
        processCustomExcel();
    }
});

// Extract Excel processing to a separate function
function processCustomExcel() {
    const errorMessage = document.getElementById('errorMessage');
    
    // Continue with Excel processing
    fetch('/api/read-protocol-excel')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
            // Rest of Excel processing code...
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
            return fetch('/api/save-excel', {
                method: 'POST',
                body: formData
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Error storing data');
            }

            // Read the saved Excel file to extract and store data
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
                            ips: headerRow.indexOf('Inflation Pressure [PSI]'),
                            loads: headerRow.indexOf('Loads[Kg]'),
                            ias: headerRow.indexOf('Inclination Angle[°]'),
                            sa_range: headerRow.indexOf('Slip Angle[°]'),
                            sr_range: headerRow.indexOf('Slip Ratio [%]'),
                            test_velocity: headerRow.indexOf('Test Velocity [Kmph]')
                        };

                        // Extract data rows
                        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                            const row = jsonData[i];
                            if (!row || !row[columns.runs]) continue;

                            extractedData.push({
                                number_of_runs: parseInt(row[columns.runs]),
                                tests: row[columns.tests]?.toString() || '',
                                ips: row[columns.ips]?.toString() || '',
                                loads: row[columns.loads]?.toString() || '',
                                ias: row[columns.ias]?.toString() || '',
                                sa_range: row[columns.sa_range]?.toString() || '',
                                sr_range: row[columns.sr_range]?.toString() || '',
                                test_velocity: row[columns.test_velocity]?.toString() || ''
                            });
                        }
                    });

                    if (extractedData.length === 0) {
                        throw new Error('No valid data found in Excel file');
                    }

                    // Store the extracted data
                    return fetch('/api/store-excel-data', {
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

            // Generate parameters.inc file
            const parameterData = {
                load1_kg: document.getElementById('l1').value,
                load2_kg: document.getElementById('l2').value,
                load3_kg: document.getElementById('l3').value,
                pressure1: document.getElementById('p1').value,
                pressure2: document.getElementById('p2').value,
                pressure3: document.getElementById('p3').value,
                speed_kmph: document.getElementById('vel').value,
                IA: document.getElementById('ia').value,
                SA: document.getElementById('sa').value,
                SR: document.getElementById('sr').value,
                width: document.getElementById('rimWidth').value,
                diameter: document.getElementById('rimDiameter').value
            };

            return fetch('/api/generate-parameters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(parameterData)
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Error generating parameter file');
            }
            updateTestSummary();
            window.location.href = '/select.html';
        })
        .catch(error => {
            errorMessage.style.color = '#d9534f';
            errorMessage.textContent = error.message || 'Error processing file. Please try again.';
        });
}