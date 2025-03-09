// Add at the beginning of the file
document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

// Submit button handling
document.getElementById('submitBtn').addEventListener('click', function() {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = '';

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
                    'V1': document.getElementById('v1').value.trim() || null,
                    'V2': document.getElementById('v2').value.trim() || null,
                    'V3': document.getElementById('v3').value.trim() || null,
                    'V4': document.getElementById('v4').value.trim() || null
                };

                // Create a new sheet while preserving all original data
                const newSheet = jsonData.map(row => {
                    if (!Array.isArray(row)) return row;
                    return row.map(cell => {
                        if (cell === null || cell === undefined) return cell;
                        
                        const cellStr = String(cell).trim();
                        // Only process cells that exactly match our replacement keys
                        if (replacements.hasOwnProperty(cellStr) && replacements[cellStr] !== null) {
                            return replacements[cellStr];
                        }
                        
                        // Special handling for L1,L2,L3 case
                        if (cellStr === 'L1,L2,L3' || 
                            (cellStr.includes('L1') && cellStr.includes('L2') && cellStr.includes('L3'))) {
                            const parts = cellStr.split(',');
                            const newParts = parts.map(part => {
                                const trimmed = part.trim();
                                return replacements[trimmed] !== null ? replacements[trimmed] : trimmed;
                            });
                            return newParts.join(',');
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
                    
                    // Find the header row that contains "Number Of Runs"
                    let headerRowIndex = -1;
                    for(let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if(row && row.some(cell => 
                            cell && typeof cell === 'string' && 
                            cell.toLowerCase().includes('number of runs'))) {
                            headerRowIndex = i;
                            break;
                        }
                    }
                    
                    if (headerRowIndex === -1) return;
                    
                    const headerRow = jsonData[headerRowIndex];
                    const getColumnIndex = (header) => {
                        return headerRow.findIndex(col => 
                            col && typeof col === 'string' && 
                            col.toLowerCase().includes(header.toLowerCase())
                        );
                    };

                    const columns = {
                        runs: getColumnIndex('number of runs'),
                        tests: getColumnIndex('tests'),
                        ips: getColumnIndex('ips'),
                        loads: getColumnIndex('loads'),
                        ias: getColumnIndex('ias'),
                        sa: getColumnIndex('sa range'),
                        sr: getColumnIndex('sr range'),
                        velocity: getColumnIndex('test velocity')
                    };

                    // Verify all required columns were found
                    if (Object.values(columns).some(idx => idx === -1)) {
                        console.error('Missing required columns:', columns);
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
                // Redirect to select.html after successful insertion
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