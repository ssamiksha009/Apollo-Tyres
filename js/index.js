// JavaScript to handle the form submission
document.getElementById('submitBtn').addEventListener('click', function() {
    const project = document.getElementById('project').value.trim();
    const region = document.getElementById('region').value;
    const department = document.getElementById('department').value;
    const tyreSize = document.getElementById('tyreSize').value.trim();
    const protocol = document.getElementById('protocol').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Check if all fields are filled
    if (!project || !region || !department || !tyreSize || !protocol) {
        errorMessage.textContent = 'Please fill in all fields';
        return;
    }
    
    // Clear any previous error messages
    errorMessage.textContent = '';
    
    // If protocol is MF62, redirect to mf.html
    if (protocol === 'MF62') {
        window.location.href = 'mf.html';
    } else {
        // For other protocols, you could add different redirections or actions here
        alert('Selected: ' + project + ', ' + region + ', ' + department + ', ' + tyreSize + ', ' + protocol);
    }
});