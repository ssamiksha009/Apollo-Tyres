document.getElementById('logoutBtn').addEventListener('click', function() {
    window.location.href = '/login.html';
});

// Fetch and display MF data when the page loads
window.addEventListener('load', function() {
    fetch('/api/get-mf-data')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('dataTableBody');
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
        })
        .catch(error => console.error('Error loading data:', error));
});

// Replace the Run button handler with simplified version
document.getElementById('runBtn').addEventListener('click', function() {
    // TODO: Add functionality for what happens when Run is clicked
    console.log('Run button clicked');
});
