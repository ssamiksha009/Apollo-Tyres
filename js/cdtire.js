// Copy ftire.js content and replace all instances of 'ftire' with 'cdtire' in the API endpoints

document.addEventListener('DOMContentLoaded', function () {
    // Add event listeners after DOM is loaded
    document.getElementById('logoutBtn')?.addEventListener('click', function () {
        window.location.href = '/login.html';
    });

    document.getElementById('homeBtn')?.addEventListener('click', function () {
        window.location.href = '/index.html';
    });

    // Call updateTestSummary when page loads
    updateTestSummary();

    // Submit button handling
    document.getElementById('submitBtn')?.addEventListener('click', function () {
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
        const meshFile = document.getElementById('meshFile')?.files[0];
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
                    processCDTireExcel();
                })
                .catch(error => {
                    errorMessage.style.color = '#d9534f';
                    errorMessage.textContent = error.message || 'Error uploading mesh file. Please try again.';
                });
        } else {
            // Proceed without mesh file upload
            processCDTireExcel();
        }
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

function processCDTireExcel() {
    const errorMessage = document.getElementById('errorMessage');

    // Check if project is selected
    const projectName = sessionStorage.getItem('currentProject');
    if (!projectName) {
        errorMessage.style.color = '#d9534f';
        errorMessage.textContent = 'Please select a project first';
        errorMessage.style.display = 'block';
        return;
    }

    // Create a function to safely get input value
    const getInputValue = (id) => {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Input element with id '${id}' not found`);
        }
        return element.value || '';
    };

    try {
        // Generate parameter file with safe value getting
        const parameterData = {
            load1_kg: getInputValue('l1'),
            load2_kg: getInputValue('l2'),
            load3_kg: getInputValue('l3'),
            load4_kg: getInputValue('l4'),
            load5_kg: getInputValue('l5'),
            pressure1: getInputValue('p1'),
            speed_kmph: getInputValue('vel'),
            IA: getInputValue('ia'),
            SA: getInputValue('sa'),
            SR: getInputValue('sr'),
            width: getInputValue('rimWidth'),
            diameter: getInputValue('rimDiameter')
        };

        // Continue with Excel processing
        fetch('/api/read-protocol-excel', {
            headers: { 'Referer': '/cdtire.html' }
        })
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
                const outputWorkbook = XLSX.utils.book_new();

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    const replacements = {
                        'P1': getInputValue('p1') || null,
                        'L1': getInputValue('l1') || null,
                        'L2': getInputValue('l2') || null,
                        'L3': getInputValue('l3') || null,
                        'L4': getInputValue('l4') || null,
                        'L5': getInputValue('l5') || null,
                        'VEL': getInputValue('vel') || null
                    };

                    const iaValue = document.getElementById('ia').value.trim();
                    const srValue = document.getElementById('sr').value.trim();
                    const saValue = document.getElementById('sa').value.trim();

                    // Create new sheet with replacements and preserve original P/L values
                    const newSheet = jsonData.map((row, rowIndex) => {
                        if (!Array.isArray(row)) return row;

                        const originalPValues = [];
                        const originalLValues = [];

                        const modifiedRow = row.map(cell => {
                            if (cell === null || cell === undefined) return cell;
                            const cellStr = String(cell).trim();

                            if (cellStr.match(/^P[1-3]$/)) {
                                originalPValues.push(cellStr);
                            }

                            if (cellStr.match(/^L[1-5]$/)) {
                                originalLValues.push(cellStr);
                            }

                            // Handle special values
                            if (cellStr === 'IA') return iaValue;
                            if (cellStr === '-IA') return (-Math.abs(parseFloat(iaValue))).toString();
                            if (cellStr === 'SR') return srValue;
                            if (cellStr === '-SR') return (-Math.abs(parseFloat(srValue))).toString();
                            if (cellStr === 'SA') return saValue;
                            if (cellStr === '-SA') return (-Math.abs(parseFloat(saValue))).toString();

                            if (replacements.hasOwnProperty(cellStr) && replacements[cellStr] !== null) {
                                return replacements[cellStr];
                            }

                            return cell;
                        });

                        const extendedRow = [...modifiedRow];

                        if (rowIndex === 0) {
                            extendedRow.push('Original P Values', 'Original L Values');
                        } else {
                            extendedRow.push(
                                originalPValues.join(', '),
                                originalLValues.join(', ')
                            );
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
                if (!data.success) {
                    throw new Error(data.message || 'Error saving file');
                }

                return fetch('/api/read-output-excel')
                    .then(response => response.arrayBuffer())
                    .then(data => {
                        const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
                        const extractedData = [];

                        workbook.SheetNames.forEach((sheetName) => {
                            const worksheet = workbook.Sheets[sheetName];
                            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

                            const pColumnIndex = columns.old_job >= 0 ? columns.old_job + 1 : -1;
                            const lColumnIndex = columns.old_job >= 0 ? columns.old_job + 2 : -1;

                            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                                const row = jsonData[i];
                                if (!row || !row[columns.runs]) continue;

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
                    });
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) throw new Error(data.message);

                // Create protocol-based folder structure
                const projectName = sessionStorage.getItem('currentProject');
                return fetch('/api/create-protocol-folders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        projectName: projectName.trim(),
                        protocol: 'CDTire'
                    })
                });
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.message || 'Server error creating protocol folders');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.message || 'Error creating protocol folders');
                }
                updateTestSummary();
                window.location.href = '/select.html';
            })
            .catch(error => {
                console.error('Error:', error);
                errorMessage.style.color = '#d9534f';
                errorMessage.textContent = error.message || 'Error processing file. Please try again.';
                errorMessage.style.display = 'block';
            });
    } catch (error) {
        console.error('Error:', error);
        errorMessage.style.color = '#d9534f';
        errorMessage.textContent = error.message || 'Error getting input values. Please try again.';
        errorMessage.style.display = 'block';
    }
}