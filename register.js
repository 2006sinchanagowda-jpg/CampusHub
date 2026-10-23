const registrationForm = document.getElementById('registrationForm');
const selectedEventInput = document.getElementById('selectedEvent');
const studentNameInput = document.getElementById('studentName');
const emailInput = document.getElementById('email');
const studentIdInput = document.getElementById('studentId');
const courseInput = document.getElementById('course');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const logoutButton = document.getElementById('logoutButton');

// Get the selected event from the URL
const urlParams = new URLSearchParams(window.location.search);
const eventName = urlParams.get('event');

if (eventName && selectedEventInput) {
    const matchingOption = Array.from(selectedEventInput.options)
        .find(option => option.value === eventName);

    if (matchingOption) {
        selectedEventInput.value = eventName;
    }
}

// Load the logged-in student's details
async function loadStudentDetails() {
    try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
            alert('Please log in first.');
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        studentNameInput.value = result.student.name;
        emailInput.value = result.student.email;

    } catch (error) {
        console.error('Could not load student details:', error);

        statusMessage.textContent =
            'Could not connect to the server. Please refresh the page.';
    }
}

// Submit event registration
registrationForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const eventValue = selectedEventInput.value.trim();
    const courseValue = courseInput.value;
    const studentIdValue = studentIdInput.value.trim();

    if (!eventValue || !courseValue || !studentIdValue) {
        statusMessage.textContent =
            'Please select an event, enter your Student ID, and select your course.';
        return;
    }

    submitButton.disabled = true;
    statusMessage.textContent = 'Submitting your registration...';

    try {
        // Confirm the login session
        const sessionResponse = await fetch('/api/auth/me');

        if (!sessionResponse.ok) {
            statusMessage.textContent = 'Please log in first.';
            window.location.href = 'login.html';
            return;
        }

        // Send registration details to the backend
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventName: eventValue,
                course: courseValue
            })
        });

        const result = await response.json();

        if (!response.ok) {
            statusMessage.textContent =
                result.message || 'Registration failed. Please try again.';
            return;
        }

        statusMessage.textContent =
            'Registration successful! Opening your dashboard...';

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1200);

    } catch (error) {
        console.error('Registration error:', error);

        statusMessage.textContent =
            'Could not connect to the server. Please try again.';

    } finally {
        submitButton.disabled = false;
    }
});

// Logout
if (logoutButton) {
    logoutButton.addEventListener('click', async function () {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            if (response.ok) {
                window.location.href = 'login.html';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            alert('Could not connect to the server.');
        }
    });
}

// Load the student's details when the page opens
loadStudentDetails();
