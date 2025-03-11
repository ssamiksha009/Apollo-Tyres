// JavaScript to handle the form submission
document.getElementById('submitBtn').addEventListener('click', function() {
    const region = document.getElementById('region').value;
    const department = document.getElementById('department').value;
    const tyreSize = document.getElementById('tyreSize').value;
    const protocol = document.getElementById('protocol').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Check if all dropdowns are selected
    if (region === '' || department === '' || tyreSize === '' || protocol === '') {
        errorMessage.textContent = 'Please select values for all dropdowns';
        return;
    }
    
    // Clear any previous error messages
    errorMessage.textContent = '';
    
    // If protocol is MF62, redirect to mf.html
    if (protocol === 'MF62') {
        window.location.href = 'mf.html';
    } else {
        // For other protocols, you could add different redirections or actions here
        alert('Selected: ' + region + ', ' + department + ', ' + tyreSize + ', ' + protocol);
    }
});