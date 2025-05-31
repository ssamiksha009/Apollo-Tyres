document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

function updateStatusIndicators() {
    const projectName = sessionStorage.getItem('currentProject');
    if (!projectName) return;

    const protocol = document.querySelector('table[style*="display: table"]').id.replace('Table', '');
    const rows = document.querySelectorAll('tbody tr');

    rows.forEach(async (row) => {
        const runNumber = row.cells[0].textContent;
        const statusCell = row.querySelector('.status-indicator');
        const runButton = document.querySelector(`.row-run-btn[data-run="${runNumber}"]`);
        
        try {
            // Get row data to find the folder and job name
            const rowDataResponse = await fetch(`/api/get-row-data?protocol=${protocol}&runNumber=${runNumber}`);
            if (!rowDataResponse.ok) return;
            
            const rowDataResult = await rowDataResponse.json();
            const { p, l, job } = rowDataResult.data;
            const folderName = `${p}_${l}`;
            
            // Check if the job's ODB file exists
            const odbResponse = await fetch(`/api/check-odb-file?projectName=${projectName}&protocol=${protocol}&folderName=${folderName}&jobName=${job}`);
            const odbResult = await odbResponse.json();
            
            if (odbResult.exists) {
                statusCell.textContent = 'Completed ✓';
                statusCell.style.color = '#28a745';
                if (runButton) runButton.style.display = 'none';
            } else {
                statusCell.textContent = 'Not started ✕';
                statusCell.style.color = '#dc3545';
                if (runButton) runButton.style.display = 'block';
            }
        } catch (error) {
            console.error('Error checking status for run', runNumber, error);
            statusCell.textContent = 'Error checking status ✕';
            statusCell.style.color = '#dc3545';
            if (runButton) runButton.style.display = 'block';
        }
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
    
    // Filter out rows where tests field is empty
    const filteredData = data.filter(row => row.tests && row.tests.trim() !== '');
    
    filteredData.forEach(row => {
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
    
    // Filter out rows where tests field is empty
    const filteredData = data.filter(row => row.tests && row.tests.trim() !== '');
    
    filteredData.forEach(row => {
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
    
    // Filter out rows where tests field is empty
    const filteredData = data.filter(row => row.tests && row.tests.trim() !== '');
    
    filteredData.forEach(row => {
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
    
    // Filter out rows where test_name field is empty
    const filteredData = data.filter(row => row.test_name && row.test_name.trim() !== '');
    
    filteredData.forEach(row => {
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
    
    // Filter out rows where tests field is empty
    const filteredData = data.filter(row => row.tests && row.tests.trim() !== '');
    
    filteredData.forEach(row => {
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
    
    // Find the row and get its UI elements
    const row = document.querySelector(`tr:has(button[data-run="${runNumber}"])`);
    const statusCell = row.querySelector('.status-indicator');
    const runButton = row.querySelector('.row-run-btn');

    // Update status to processing
    statusCell.textContent = 'Processing... ⌛';
    statusCell.style.color = '#ffc107';
    runButton.disabled = true;

    try {
        // Use the new dependency resolution endpoint that handles everything
        const response = await fetch('/api/resolve-job-dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName,
                protocol,
                runNumber
            })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Failed to resolve dependencies');
        }

        const result = await response.json();

        if (result.success) {
            statusCell.textContent = 'Completed ✓';
            statusCell.style.color = '#28a745';
            runButton.remove();
        } else {
            throw new Error(result.message || 'Job execution failed');
        }

    } catch (error) {
        console.error('Error during job execution:', error);
        statusCell.textContent = 'Error ⚠️';
        statusCell.style.color = '#dc3545';
        runButton.disabled = false;
        alert('Error during job execution: ' + error.message);
    }
}


