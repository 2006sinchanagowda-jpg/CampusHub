const form = document.getElementById('studentRegisterForm');
const statusMessage = document.getElementById('statusMessage');
const createAccountButton = document.getElementById('createAccountButton');

form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const studentName = document
        .getElementById('studentName')
        .value
        .trim();

    const email = document
        .getElementById('email')
        .value
        .trim();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!studentName || !email || !password || !confirmPassword) {
        statusMessage.textContent = 'Please fill in all fields.';
        return;
    }

    if (password !== confirmPassword) {
        statusMessage.textContent = 'Passwords do not match.';
        return;
    }

    if (password.length < 8 || password.length > 72) {
        statusMessage.textContent =
            'Password must be between 8 and 72 characters.';
        return;
    }

    createAccountButton.disabled = true;
    statusMessage.textContent = 'Creating your account...';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentName: studentName,
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            statusMessage.textContent =
                result.message || 'Registration failed. Please try again.';
            return;
        }

        statusMessage.textContent =
            'Account created successfully! Redirecting to login...';

        form.reset();

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);

        statusMessage.textContent =
            'Could not connect to the server. Please try again.';
    } finally {
        createAccountButton.disabled = false;
    }
});
