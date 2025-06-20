document.addEventListener('DOMContentLoaded', function () {
    // Wait for the header to be loaded from common.js
    setTimeout(() => {
        init();
    }, 100);
});

function init() {
    // Call updateTestSummary immediately
    updateTestSummary();

    // Submit button handling
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = '';
            }

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
                if (errorMessage) {
                    errorMessage.textContent = '* All fields are mandatory and must be positive numbers';
                    errorMessage.style.display = 'block';
                }
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
                        processMF52Excel();
                    })
                    .catch(error => {
                        if (errorMessage) {
                            errorMessage.style.color = '#d9534f';
                            errorMessage.textContent = error.message || 'Error uploading mesh file. Please try again.';
                        }
                    });
            } else {
                // Proceed without mesh file upload
                processMF52Excel();
            }
        });
    }
}

// Keep these functions outside DOMContentLoaded
function updateTestSummary() {
    fetch('/api/get-mf52-summary')
        .then(response => response.json())
        .then(data => {
            const summaryContainer = document.getElementById('testSummary');
            if (summaryContainer) {
                summaryContainer.innerHTML = data.map(item => `
                    <div class="summary-item">
                        <span class="test-name">${item.tests}:</span>
                        <span class="test-count">${item.count}</span>
                    </div>
                `).join('');
            }
        })
        .catch(error => console.error('Error fetching test summary:', error));
}

function processMF52Excel() {
    const errorMessage = document.getElementById('errorMessage');

    const parameterData = {
        load1_kg: document.getElementById('l1').value,
        load2_kg: document.getElementById('l2').value,
        load3_kg: document.getElementById('l3').value,
        pressure2: document.getElementById('p2').value,
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
            return fetch('/api/read-protocol-excel');
        })
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
            const outputWorkbook = XLSX.utils.book_new();

            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Replace values in the sheet
                const replacements = {
                    'P2': document.getElementById('p2').value.trim() || null,
                    'L1': document.getElementById('l1').value.trim() || null,
                    'L2': document.getElementById('l2').value.trim() || null,
                    'L3': document.getElementById('l3').value.trim() || null,
                    'VEL': document.getElementById('vel').value.trim() || null,
                    'Vel': document.getElementById('vel').value.trim() || null,
                    'vel': document.getElementById('vel').value.trim() || null,
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

                        if (cellStr.toLowerCase() === 'vel') {
                            return document.getElementById('vel').value.trim();
                        }

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
            formData.append('excelFile', new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'output.xlsx');

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

            return fetch('/api/read-output-excel')
                .then(response => response.arrayBuffer())
                .then(data => {
                    const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
                    const extractedData = [];

                    workbook.SheetNames.forEach((sheetName) => {
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                        let headerRowIndex = jsonData.findIndex(row =>
                            row && row.includes('Number Of Tests'));

                        if (headerRowIndex === -1) return;

                        const headerRow = jsonData[headerRowIndex];
                        const columns = {
                            runs: headerRow.indexOf('Number Of Tests'),
                            tests: headerRow.indexOf('Tests'),
                            inflation_pressure: headerRow.indexOf('Inflation Pressure [PSI]'),
                            loads: headerRow.indexOf('Loads[Kg]'),
                            inclination_angle: headerRow.indexOf('Inclination Angle[°]'),
                            slip_angle: headerRow.indexOf('Slip Angle[°]'),
                            slip_ratio: headerRow.indexOf('Slip Ratio [%]'),
                            test_velocity: headerRow.indexOf('Test Velocity [Kmph]'),
                            job: headerRow.indexOf('Job'),
                            old_job: headerRow.indexOf('Old Job')
                        };

                        const pColumnIndex = columns.old_job >= 0 ? columns.old_job + 1 : -1;
                        const lColumnIndex = columns.old_job >= 0 ? columns.old_job + 2 : -1;

                        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                            const row = jsonData[i];
                            if (!row || !row[columns.runs]) continue;

                            extractedData.push({
                                number_of_runs: parseInt(row[columns.runs]),
                                tests: row[columns.tests]?.toString() || '',
                                inflation_pressure: row[columns.inflation_pressure]?.toString() || '',
                                loads: row[columns.loads]?.toString() || '',
                                inclination_angle: row[columns.inclination_angle]?.toString() || '',
                                slip_angle: row[columns.slip_angle]?.toString() || '',
                                slip_ratio: row[columns.slip_ratio]?.toString() || '',
                                test_velocity: row[columns.test_velocity]?.toString() || '',
                                job: columns.job >= 0 ? (row[columns.job]?.toString() || '') : '',
                                old_job: columns.old_job >= 0 ? (row[columns.old_job]?.toString() || '') : '',
                                p: pColumnIndex >= 0 ? (row[pColumnIndex]?.toString() || '') : '',
                                l: lColumnIndex >= 0 ? (row[lColumnIndex]?.toString() || '') : ''
                            });
                        }
                    });

                    if (extractedData.length === 0) {
                        throw new Error('No valid data found in Excel file');
                    }

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

            const projectName = sessionStorage.getItem('currentProject') || 'DefaultProject';
            return fetch('/api/create-protocol-folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectName: projectName,
                    protocol: 'MF52'
                })
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Error creating protocol folders');
            }
            updateTestSummary();
            window.location.href = '/select.html';
        })
        .catch(error => {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.style.color = '#d9534f';
                errorMessage.textContent = error.message || 'Error processing file. Please try again.';
            }
            console.error('Error:', error);
        });
}
