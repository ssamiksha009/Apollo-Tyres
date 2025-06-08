document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        document.getElementById('errorMessage').textContent = 'Not authenticated';
        return;
    }

    // Fetch users and projects for KPIs and table
    fetch('/api/manager/users', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            document.getElementById('errorMessage').textContent = data.message || 'Failed to load data';
            return;
        }
        // KPIs
        document.getElementById('totalEngineers').textContent = data.users.length;
        let totalProjects = data.users.reduce((sum, user) => sum + (user.project_count || 0), 0);
        document.getElementById('totalProjects').textContent = totalProjects;
        // Active Engineers (last 7 days)
        const now = new Date();
        let activeCount = data.users.filter(user => user.last_login && (now - new Date(user.last_login)) < 7*24*60*60*1000).length;
        document.getElementById('activeEngineers').textContent = activeCount;

        // Render table
        renderUsersTable(data.users);

        // Search/filter
        document.getElementById('searchInput').addEventListener('input', function() {
            filterAndRender(data.users);
        });
        document.getElementById('activityFilter').addEventListener('change', function() {
            filterAndRender(data.users);
        });
    });

    // Fetch notifications
    fetch('/api/manager/notifications', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.notifications && data.notifications.length > 0) {
            const area = document.getElementById('notificationsArea');
            area.style.display = '';
            area.innerHTML = data.notifications.map(n => `<div>${n}</div>`).join('');
        }
    });

    // Fetch recent activity
    fetch('/api/manager/recent-activity', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.activities) {
            const ul = document.getElementById('recentActivityList');
            ul.innerHTML = '';
            data.activities.forEach(act => {
                const li = document.createElement('li');
                li.textContent = act;
                ul.appendChild(li);
            });
        }
    });

    // Filtering function
    function filterAndRender(users) {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const activity = document.getElementById('activityFilter').value;
        const now = new Date();
        let filtered = users.filter(user => user.email.toLowerCase().includes(search));
        if (activity === 'active') {
            filtered = filtered.filter(user => user.last_login && (now - new Date(user.last_login)) < 7*24*60*60*1000);
        } else if (activity === 'inactive') {
            filtered = filtered.filter(user => !user.last_login || (now - new Date(user.last_login)) >= 7*24*60*60*1000);
        }
        renderUsersTable(filtered);
    }

    // Table rendering
    function renderUsersTable(users) {
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${new Date(user.created_at).toLocaleString()}</td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                <td>${user.project_count !== undefined ? user.project_count : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
});