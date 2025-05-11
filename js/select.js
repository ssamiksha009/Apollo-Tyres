document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

function updateStatusIndicators() {
    const projectName = sessionStorage.getItem('currentProject');
    if (!projectName) return;

    const protocol = document.querySelector('table[style*="display: table"]').id.replace('Table', '');
    const rows = document.querySelectorAll('tbody tr');

    rows.forEach(row => {
        const runNumber = row.cells[0].textContent;
        const statusCell = row.querySelector('.status-indicator');
        const runButton = document.querySelector(`.row-run-btn[data-run="${runNumber}"]`);
        
        fetch(`/api/check-analysis-status?projectName=${projectName}&protocol=${protocol}&run=${runNumber}`)
            .then(response => response.json())
            .then(data => {
                // Update status indicator
                switch(data.status) {
                    case "Completed":
                        statusCell.textContent = 'Completed ✓';
                        statusCell.style.color = '#28a745';
                        if (runButton) runButton.style.display = 'none';
                        break;
                    case "Running":
                        statusCell.textContent = 'Running ⌛';
                        statusCell.style.color = '#ffc107';
                        if (runButton) runButton.style.display = 'none';
                        break;
                    case "Error":
                        statusCell.textContent = 'Error ✕';
                        statusCell.style.color = '#dc3545';
                        if (runButton) runButton.style.display = 'block';
                        break;
                    default:
                        statusCell.textContent = 'Not started ✕';
                        statusCell.style.color = '#dc3545';
                        if (runButton) runButton.style.display = 'block';
                }
            });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const referer = document.referrer;
    const mf62Table = document.getElementById('mf62Table');
    const mf52Table = document.getElementById('mf52Table');
    const ftireTable = document.getElementById('ftireTable');
    const cdtireTable = document.getElementById('cdtireTable');
    const customTable = document.getElementById('customTable');
    let fetchEndpoint;

    // Hide all tables first
    mf62Table.style.display = 'none';
    mf52Table.style.display = 'none';
    ftireTable.style.display = 'none';
    cdtireTable.style.display = 'none';
    customTable.style.display = 'none';

    // Show appropriate table and set endpoint
    if (referer.includes('mf52.html')) {
        fetchEndpoint = '/api/get-mf52-data';
        mf52Table.style.display = 'table';
    } else if (referer.includes('mf.html')) {
        fetchEndpoint = '/api/get-mf-data';
        mf62Table.style.display = 'table';
    } else if (referer.includes('ftire.html')) { // Changed from 'FTire.html' to 'ftire.html'
        fetchEndpoint = '/api/get-ftire-data';
        ftireTable.style.display = 'table';
    } else if (referer.includes('cdtire.html')) {
        fetchEndpoint = '/api/get-cdtire-data';
        cdtireTable.style.display = 'table';
    } else if (referer.includes('custom.html')) {
        fetchEndpoint = '/api/get-custom-data';
        customTable.style.display = 'table';
    } else {
        document.getElementById('data-container').innerHTML = 
            '<p class="error-message">Please select a protocol first</p>';
        return;
    }

    // Set protocol title based on referer
    const protocolTitle = document.getElementById('protocol-title');
    if (referer.includes('mf52.html')) {
        protocolTitle.textContent = 'MF 5.2 Protocol';
    } else if (referer.includes('mf.html')) {
        protocolTitle.textContent = 'MF 6.2 Protocol';
    } else if (referer.includes('ftire.html')) {
        protocolTitle.textContent = 'FTire Protocol';
    } else if (referer.includes('cdtire.html')) {
        protocolTitle.textContent = 'CDTire Protocol';
    } else if (referer.includes('custom.html')) {
        protocolTitle.textContent = 'Custom Protocol';
    }

    // Fetch and display appropriate data
    fetch(fetchEndpoint)
        .then(response => response.json())
        .then(data => {
            if (referer.includes('mf52.html')) {
                displayMF52Data(data);
            } else if (referer.includes('mf.html')) {
                displayMF62Data(data);
            } else if (referer.includes('ftire.html')) {
                displayFTireData(data);
            } else if (referer.includes('cdtire.html')) {
                displayCDTireData(data);
            } else if (referer.includes('custom.html')) {
                displayCustomData(data);
            }
            // Update status indicators after displaying data
            updateStatusIndicators();
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('data-container').innerHTML = 
                '<p class="error-message">Error loading data</p>';
        });
});

// Add event listener for page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        updateStatusIndicators();
    }
});

function createRunButton(runNumber) {
    // Initially create all buttons but hidden
    return `<button class="row-run-btn" data-run="${runNumber}" style="display: none">Run</button>`;
}

function displayMF62Data(data) {
    const tableBody = document.getElementById('mf62TableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; // Clear existing data
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.number_of_runs}</td>
            <td>${row.tests}</td>
            <td>${row.ips}</td>
            <td>${row.loads}</td>
            <td>${row.ias}</td>
            <td>${row.sa_range}</td>
            <td>${row.sr_range}</td>
            <td>${row.test_velocity}</td>
            <td class="status-cell">
                <span class="status-indicator">Not started ✕</span>
            </td>
            <td class="run-button-cell">
                ${createRunButton(row.number_of_runs)}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listeners to run buttons
    document.querySelectorAll('.row-run-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const runNumber = this.getAttribute('data-run');
            runSingleAnalysis(runNumber);
        });
    });
}

function displayMF52Data(data) {
    const tableBody = document.getElementById('mf52TableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; // Clear existing data
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.number_of_runs}</td>
            <td>${row.tests}</td>
            <td>${row.inflation_pressure}</td>
            <td>${row.loads}</td>
            <td>${row.inclination_angle}</td>
            <td>${row.slip_angle}</td>
            <td>${row.slip_ratio}</td>
            <td>${row.test_velocity}</td>
            <td class="status-cell">
                <span class="status-indicator">Not started ✕</span>
            </td>
            <td class="run-button-cell">
                ${createRunButton(row.number_of_runs)}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listeners to run buttons
    document.querySelectorAll('.row-run-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const runNumber = this.getAttribute('data-run');
            runSingleAnalysis(runNumber);
        });
    });
}

function displayFTireData(data) {
    const tableBody = document.getElementById('ftireTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        // Updated order to match Excel columns:
        // S.No, Test, Load (N), IP (Kpa), Speed (kmph), Longitudinal Slip (%), Slip Angle (deg), Inclination Angle (deg), Cleat Orientation (deg)
        tr.innerHTML = `
            <td>${row.number_of_runs}</td>
            <td>${row.tests}</td>
            <td>${row.loads}</td>
            <td>${row.inflation_pressure}</td>
            <td>${row.test_velocity}</td>
            <td>${row.longitudinal_slip}</td>
            <td>${row.slip_angle}</td>
            <td>${row.inclination_angle}</td>
            <td>${row.cleat_orientation}</td>
            <td class="status-cell">
                <span class="status-indicator">Not started ✕</span>
            </td>
            <td class="run-button-cell">
                ${createRunButton(row.number_of_runs)}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listeners to run buttons
    document.querySelectorAll('.row-run-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const runNumber = this.getAttribute('data-run');
            runSingleAnalysis(runNumber);
        });
    });
}

function displayCDTireData(data) {
    const tableBody = document.getElementById('cdtireTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.number_of_runs}</td>
            <td>${row.test_name}</td>
            <td>${row.inflation_pressure}</td>
            <td>${row.velocity}</td>
            <td>${row.preload}</td>
            <td>${row.camber}</td>
            <td>${row.slip_angle}</td>
            <td>${row.displacement}</td>
            <td>${row.slip_range}</td>
            <td>${row.cleat}</td>
            <td>${row.road_surface}</td>
            <td class="status-cell">
                <span class="status-indicator">Not started ✕</span>
            </td>
            <td class="run-button-cell">
                ${createRunButton(row.number_of_runs)}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listeners to run buttons
    document.querySelectorAll('.row-run-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const runNumber = this.getAttribute('data-run');
            runSingleAnalysis(runNumber);
        });
    });
}

function displayCustomData(data) {
    const tableBody = document.getElementById('customTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.number_of_runs}</td>
            <td>${row.protocol || 'Custom'}</td>
            <td>${row.tests}</td>
            <td>${row.inflation_pressure}</td>
            <td>${row.loads}</td>
            <td>${row.inclination_angle}</td>
            <td>${row.slip_angle}</td>
            <td>${row.slip_ratio}</td>
            <td>${row.test_velocity}</td>
            <td>${row.cleat_orientation}</td>
            <td>${row.displacement}</td>
            <td class="status-cell">
                <span class="status-indicator">Not started ✕</span>
            </td>
            <td class="run-button-cell">
                ${createRunButton(row.number_of_runs)}
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Add event listeners to run buttons
    document.querySelectorAll('.row-run-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const runNumber = this.getAttribute('data-run');
            runSingleAnalysis(runNumber);
        });
    });
}

async function runSingleAnalysis(runNumber) {
    const projectName = sessionStorage.getItem('currentProject');
    if (!projectName) {
        window.location.href = '/index.html';
        return;
    }

    const protocol = document.querySelector('table[style*="display: table"]').id.replace('Table', '');
    
    // Find the row and get its data
    const row = document.querySelector(`tr:has(button[data-run="${runNumber}"])`);
    const cells = row.cells;
    const statusCell = row.querySelector('.status-indicator');
    const runButton = row.querySelector('.row-run-btn');

    // Prepare row data based on protocol
    let rowData;
    switch(protocol.toLowerCase()) {
        case 'mf62':
            rowData = {
                number_of_runs: cells[0].textContent,
                tests: cells[1].textContent,
                ips: cells[2].textContent,
                loads: cells[3].textContent,
                ias: cells[4].textContent,
                sa_range: cells[5].textContent,
                sr_range: cells[6].textContent,
                test_velocity: cells[7].textContent
            };
            break;
        case 'mf52':
            rowData = {
                number_of_runs: cells[0].textContent,
                tests: cells[1].textContent,
                inflation_pressure: cells[2].textContent,
                loads: cells[3].textContent,
                inclination_angle: cells[4].textContent,
                slip_angle: cells[5].textContent,
                slip_ratio: cells[6].textContent,
                test_velocity: cells[7].textContent
            };
            break;
        case 'ftire':
            rowData = {
                number_of_runs: cells[0].textContent,
                tests: cells[1].textContent,
                loads: cells[2].textContent,
                inflation_pressure: cells[3].textContent,
                test_velocity: cells[4].textContent,
                longitudinal_slip: cells[5].textContent,
                slip_angle: cells[6].textContent,
                inclination_angle: cells[7].textContent,
                cleat_orientation: cells[8].textContent
            };
            break;
        case 'cdtire':
            rowData = {
                number_of_runs: cells[0].textContent,
                test_name: cells[1].textContent,
                inflation_pressure: cells[2].textContent,
                velocity: cells[3].textContent,
                preload: cells[4].textContent,
                camber: cells[5].textContent,
                slip_angle: cells[6].textContent,
                displacement: cells[7].textContent,
                slip_range: cells[8].textContent,
                cleat: cells[9].textContent,
                road_surface: cells[10].textContent
            };
            break;
        case 'custom':
            rowData = {
                number_of_runs: cells[0].textContent,
                protocol: cells[1].textContent,
                tests: cells[2].textContent,
                inflation_pressure: cells[3].textContent,
                loads: cells[4].textContent,
                inclination_angle: cells[5].textContent,
                slip_angle: cells[6].textContent,
                slip_ratio: cells[7].textContent,
                test_velocity: cells[8].textContent,
                cleat_orientation: cells[9].textContent,
                displacement: cells[10].textContent
            };
            break;
    }

    // Update status to running
    statusCell.textContent = 'Running ⌛';
    statusCell.style.color = '#ffc107';
    runButton.disabled = true;

    try {
        // Step 1: Copy protocol files
        const copyResponse = await fetch('/api/copy-protocol-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName,
                protocol,
                runs: [runNumber]
            })
        });
        if (!copyResponse.ok) throw new Error('Failed to copy protocol files');

        // Step 2: Generate row-specific input file
        const generateResponse = await fetch('/api/generate-input-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName,
                protocol,
                rows: [rowData]
            })
        });
        if (!generateResponse.ok) throw new Error('Failed to generate input files');

        // Step 3: Start analysis for this run
        const runResponse = await fetch('/api/run-abaqus-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName,
                protocol,
                runNumber
            })
        });
        if (!runResponse.ok) throw new Error('Failed to start analysis');

        // Set up status polling
        const pollStatus = setInterval(() => {
            fetch(`/api/check-analysis-status?projectName=${projectName}&protocol=${protocol}&run=${runNumber}`)
                .then(response => response.json())
                .then(data => {
                    switch(data.status) {
                        case "Completed":
                            statusCell.textContent = 'Completed ✓';
                            statusCell.style.color = '#28a745';
                            runButton.remove();
                            clearInterval(pollStatus);
                            break;
                        case "Error":
                            statusCell.textContent = 'Error ✕';
                            statusCell.style.color = '#dc3545';
                            runButton.disabled = false;
                            clearInterval(pollStatus);
                            break;
                    }
                });
        }, 5000);

    } catch (error) {
        console.error('Error during single run setup:', error);
        statusCell.textContent = 'Error ✕';
        statusCell.style.color = '#dc3545';
        runButton.disabled = false;
        alert('Error setting up analysis: ' + error.message);
    }
}

document.getElementById('runBtn').addEventListener('click', async function() {
    const projectName = sessionStorage.getItem('currentProject');
    if (!projectName) {
        window.location.href = '/index.html';
        return;
    }

    const protocol = document.querySelector('table[style*="display: table"]').id.replace('Table', '');
    const rows = document.querySelectorAll('tbody tr');
    const statusIndicators = {};

    // Create a map of run numbers to status indicators
    rows.forEach(row => {
        const runNumber = row.cells[0].textContent;
        statusIndicators[runNumber] = row.querySelector('.status-indicator');
    });
    
    // First check for already completed analyses
    Object.entries(statusIndicators).forEach(([runNumber, indicator]) => {
        fetch(`/api/check-analysis-status?projectName=${projectName}&protocol=${protocol}&run=${runNumber}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "Completed") {
                    indicator.textContent = 'Completed ✓';
                    indicator.style.color = '#28a745';
                }
            });
    });

    // Get array of row data for pre-analysis
    const rowData = Array.from(rows).map(row => {
        const cells = row.cells;
        const protocol = document.querySelector('table[style*="display: table"]').id.replace('Table', '').toLowerCase();
        
        // Create row data object based on protocol
        let data = {
            number_of_runs: cells[0].textContent
        };

        switch(protocol) {
            case 'mf62':
                data = {
                    ...data,
                    tests: cells[1].textContent,
                    ips: cells[2].textContent,
                    loads: cells[3].textContent,
                    ias: cells[4].textContent,
                    sa_range: cells[5].textContent,
                    sr_range: cells[6].textContent,
                    test_velocity: cells[7].textContent
                };
                break;
            case 'mf52':
                data = {
                    ...data,
                    tests: cells[1].textContent,
                    inflation_pressure: cells[2].textContent,
                    loads: cells[3].textContent,
                    inclination_angle: cells[4].textContent,
                    slip_angle: cells[5].textContent,
                    slip_ratio: cells[6].textContent,
                    test_velocity: cells[7].textContent
                };
                break;
            case 'ftire':
                data = {
                    ...data,
                    tests: cells[1].textContent,
                    loads: cells[2].textContent,
                    inflation_pressure: cells[3].textContent,
                    test_velocity: cells[4].textContent,
                    longitudinal_slip: cells[5].textContent,
                    slip_angle: cells[6].textContent,
                    inclination_angle: cells[7].textContent,
                    cleat_orientation: cells[8].textContent
                };
                break;
            case 'cdtire':
                data = {
                    ...data,
                    test_name: cells[1].textContent,
                    inflation_pressure: cells[2].textContent,
                    velocity: cells[3].textContent,
                    preload: cells[4].textContent,
                    camber: cells[5].textContent,
                    slip_angle: cells[6].textContent,
                    displacement: cells[7].textContent,
                    slip_range: cells[8].textContent,
                    cleat: cells[9].textContent,
                    road_surface: cells[10].textContent
                };
                break;
            case 'custom':
                data = {
                    ...data,
                    protocol: cells[1].textContent,
                    tests: cells[2].textContent,
                    inflation_pressure: cells[3].textContent,
                    loads: cells[4].textContent,
                    inclination_angle: cells[5].textContent,
                    slip_angle: cells[6].textContent,
                    slip_ratio: cells[7].textContent,
                    test_velocity: cells[8].textContent,
                    cleat_orientation: cells[9].textContent,
                    displacement: cells[10].textContent
                };
                break;
        }
        return data;
    });

    try {
        // Step 1: Copy protocol files for each run
        const copyResponse = await fetch('/api/copy-protocol-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectName,
                protocol,
                runs: rowData.map(row => row.number_of_runs)
            })
        });
        if (!copyResponse.ok) throw new Error('Failed to copy protocol files');

        // Step 2: Generate row-specific input files
        const generateResponse = await fetch('/api/generate-input-files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectName,
                protocol,
                rows: rowData
            })
        });
        if (!generateResponse.ok) throw new Error('Failed to generate input files');

        // Step 3: Run Abaqus jobs
        const runResponse = await fetch('/api/run-abaqus-jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectName,
                protocol
            })
        });
        if (!runResponse.ok) throw new Error('Failed to start Abaqus jobs');

        // Start polling for status updates
        const pollStatus = setInterval(() => {
            updateStatusIndicators();
            
            // Check if all runs are completed or errored
            const allDone = Array.from(document.querySelectorAll('.status-indicator')).every(ind => 
                ind.textContent.includes('Completed') || 
                ind.textContent.includes('Error')
            );
            
            if (allDone) {
                clearInterval(pollStatus);
            }
        }, 5000);

    } catch (error) {
        console.error('Error during analysis setup:', error);
        alert('Error during analysis setup: ' + error.message);
    }
});
