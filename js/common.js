document.addEventListener('DOMContentLoaded', async function () {
    // Don't load header for login and register pages
    if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
        try {
            // Load header
            const response = await fetch('/components/header.html');
            const headerHtml = await response.text();
            document.body.insertAdjacentHTML('afterbegin', headerHtml);

            // Add event listeners
            document.getElementById('homeBtn').addEventListener('click', function () {
                window.location.href = '/index.html';
            });

            document.getElementById('logoutBtn').addEventListener('click', function (e) {
                e.preventDefault();
                // Clear any auth tokens if needed
                localStorage.removeItem('authToken');
                window.location.href = '/login.html';
            });
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }
});