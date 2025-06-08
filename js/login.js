// Event listener for the login form submission
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error messages
    errorMessage.textContent = '';
    
    // Basic client-side validation
    if (!email || !password) {
        errorMessage.textContent = 'Please enter both email and password';
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address';
        return;
    }
    
    // Make a POST request to the server for authentication
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Store authentication token in localStorage
            localStorage.setItem('authToken', data.token);

            // Decode JWT to get the role
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            if (payload.role === 'manager') {
                window.location.href = 'manager-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            // Display error message
            errorMessage.textContent = data.message || 'Invalid email or password';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred. Please try again later.';
    });
});