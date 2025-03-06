// File upload handling
document.getElementById('excelFile').addEventListener('change', function(e) {
    const fileName = e.target.files[0].name;
    document.getElementById('fileName').textContent = fileName;
});
// Updated mf.js
document.getElementById('submitBtn').addEventListener('click', function() {
    const errorMessage = document.getElementById('errorMessage');
<<<<<<< HEAD

    // Check if file is uploaded
    if (!fileInput.files.length) {
        errorMessage.textContent = 'Please upload an Excel file';
        return;
    }

=======
    
>>>>>>> f9b61759274dd575d4bd3a179e73ab1cdcd014e2
    // Clear any previous error messages
    errorMessage.textContent = '';

    // Get the values from the input fields
    const replacements = {
        'P1': document.getElementById('p1').value,
        'P2': document.getElementById('p2').value,
        'P3': document.getElementById('p3').value,
        'L1': document.getElementById('l1').value,
        'L2': document.getElementById('l2').value,
        'L3': document.getElementById('l3').value,
        'V1': document.getElementById('v1').value,
        'V2': document.getElementById('v2').value,
        'V3': document.getElementById('v3').value
    };

    console.log('Sending replacement values:', replacements);

    // Make a request to the server to read and process the Excel file
    fetch('/api/process-mf-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(replacements)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            errorMessage.textContent = data.message;
            // Change text color to green for success message
            errorMessage.style.color = '#2E8B57';
        } else {
            errorMessage.textContent = data.message;
            // Reset to red for error messages
            errorMessage.style.color = '#d9534f';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        errorMessage.textContent = 'Error processing the data. Please try again.';
        errorMessage.style.color = '#d9534f';
    });
});

// Add this to the fetch request
const token = localStorage.getItem('authToken');
fetch('/api/process-mf-data', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(replacements)
})