const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const loginButton = loginForm.querySelector('button[type="submit"]');

    loginButton.disabled = true;
    statusMessage.textContent = 'Checking your login details...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            statusMessage.textContent =
                result.message || 'Login failed. Please try again.';
            return;
        }

        statusMessage.textContent = 'Login successful! Opening dashboard...';

        window.location.href = 'dashboard.html';

    } catch (error) {
        statusMessage.textContent =
            'Cannot connect to the server. Please try again.';
    } finally {
        loginButton.disabled = false;
    }
});
