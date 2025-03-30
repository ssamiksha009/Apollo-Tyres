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
    
    // Store project name in sessionStorage before redirecting
    sessionStorage.setItem('currentProject', project);
    
    // Handle different protocol redirections
    switch(protocol) {
        case 'MF62':
            window.location.href = '/mf.html';
            break;
        case 'MF52':
            window.location.href = '/mf52.html';
            break;
        case 'FTire':
            window.location.href = '/ftire.html';
            break;
        case 'CDTire':
            window.location.href = '/cdtire.html';
            break;
        default:
            alert('Selected: ' + project + ', ' + region + ', ' + department + ', ' + tyreSize + ', ' + protocol);
            break;
    }
});