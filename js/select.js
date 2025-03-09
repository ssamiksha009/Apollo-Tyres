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
                    <td class="checkbox-cell">
                        <input type="checkbox" value="${row.number_of_runs}">
                    </td>
                    <td>${row.number_of_runs}</td>
                    <td>${row.tests}</td>
                    <td>${row.ips}</td>
                    <td>${row.loads}</td>
                    <td>${row.ias}</td>
                    <td>${row.sa_range}</td>
                    <td>${row.sr_range}</td>
                    <td>${row.test_velocity}</td>
                `;
                tableBody.appendChild(tr);
            });
        })
        .catch(error => console.error('Error loading data:', error));
});

// Add Run button handler
document.getElementById('runBtn').addEventListener('click', function() {
    const selectedRows = document.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIds = Array.from(selectedRows).map(checkbox => checkbox.value);
    
    if (selectedIds.length === 0) {
        alert('Please select at least one row');
        return;
    }
    
    console.log('Selected run numbers:', selectedIds);
    // TODO: Add functionality for what happens when Run is clicked
});
