document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

document.addEventListener('DOMContentLoaded', function() {
    const referer = document.referrer;
    const mf62Table = document.getElementById('mf62Table');
    const mf52Table = document.getElementById('mf52Table');
    const ftireTable = document.getElementById('ftireTable');
    let fetchEndpoint;

    // Hide all tables first
    mf62Table.style.display = 'none';
    mf52Table.style.display = 'none';
    ftireTable.style.display = 'none';

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
    } else {
        document.getElementById('data-container').innerHTML = 
            '<p class="error-message">Please select a protocol first</p>';
        return;
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
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('data-container').innerHTML = 
                '<p class="error-message">Error loading data</p>';
        });
});

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
                <span class="status-indicator">✕</span>
            </td>
        `;
        tableBody.appendChild(tr);
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
                <span class="status-indicator">✕</span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Add new function to display FTire data
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
                <span class="status-indicator">✕</span>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

document.getElementById('runBtn').addEventListener('click', function() {
    // TODO: Add functionality for what happens when Run is clicked
    console.log('Run button clicked');
});
