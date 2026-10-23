const registrationsList = document.getElementById('registrationsList');
const registrationsStatus = document.getElementById('registrationsStatus');

const studentName = document.getElementById('studentName');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileStatus = document.getElementById('profileStatus');

const logoutButton = document.getElementById('logoutButton');

const totalRegistrationsElement =
    document.getElementById('totalRegistrations');

const upcomingEventsElement =
    document.getElementById('upcomingEvents');

const completedEventsElement =
    document.getElementById('completedEvents');

// Event dates in YYYY-MM-DD format
const eventDates = {
    'Cultural Fest': '2026-11-25',
    'Technical Workshop': '2026-12-05',
    'Sports Day': '2026-12-15'
};

// Convert a YYYY-MM-DD date into local midnight
function getLocalDate(dateString) {
    if (!dateString) {
        return null;
    }

    const parts = dateString.split('-');

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    const date = new Date(year, month - 1, day);

    // Reject invalid dates
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

// Format a date for display
function formatDate(dateString) {
    const date = getLocalDate(dateString);

    if (!date) {
        return 'To be announced';
    }

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Reset statistics
function resetStatistics() {
    totalRegistrationsElement.textContent = '0';
    upcomingEventsElement.textContent = '0';
    completedEventsElement.textContent = '0';
}

// Calculate dashboard statistics
function updateStatistics(registrations) {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    let upcomingCount = 0;
    let completedCount = 0;

    registrations.forEach((registration) => {
        const eventDateString = eventDates[registration.event_name];
        const eventDate = getLocalDate(eventDateString);

        // Events without a known date are not counted in either category.
        if (!eventDate) {
            return;
        }

        if (eventDate >= today) {
            upcomingCount++;
        } else {
            completedCount++;
        }
    });

    totalRegistrationsElement.textContent = registrations.length;
    upcomingEventsElement.textContent = upcomingCount;
    completedEventsElement.textContent = completedCount;
}

// Load student profile
async function loadProfile() {
    try {
        const response = await fetch('/api/auth/me');

        if (response.status === 401) {
            window.location.href = 'login.html';
            return false;
        }

        const result = await response.json();

        if (!response.ok || !result.student) {
            profileStatus.textContent =
                result.message || 'Could not load your profile.';
            return false;
        }

        const student = result.student;

        studentName.textContent = student.name || 'Student';
        profileName.textContent = student.name || 'Not available';
        profileEmail.textContent = student.email || 'Not available';

        profileStatus.textContent = 'Profile loaded successfully.';

        return true;

    } catch (error) {
        console.error('Profile error:', error);

        profileStatus.textContent =
            'Could not load your profile. Please check the server.';

        return false;
    }
}

// Load registered events
async function loadRegistrations() {
    registrationsList.replaceChildren();

    registrationsStatus.textContent = 'Loading your registrations...';

    try {
        const response = await fetch('/api/registrations');

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        if (!response.ok) {
            resetStatistics();

            registrationsStatus.textContent =
                result.message || 'Could not load registrations.';

            return;
        }

        const registrations = Array.isArray(result.registrations)
            ? result.registrations
            : [];

        // Update statistics whenever registrations are loaded
        updateStatistics(registrations);

        if (registrations.length === 0) {
            registrationsStatus.textContent =
                'You have not registered for any events yet.';

            return;
        }

        registrationsStatus.textContent =
            `You have ${registrations.length} registration(s).`;

        registrations.forEach((registration) => {
            const card = document.createElement('article');
            card.className = 'event-card';

            const title = document.createElement('h3');
            title.textContent = registration.event_name || 'Unnamed Event';

            const name = document.createElement('p');
            name.textContent =
                `Student: ${registration.student_name || 'Not available'}`;

            const course = document.createElement('p');
            course.textContent =
                `Course: ${registration.course || 'Not available'}`;

            const eventDate = document.createElement('p');
            eventDate.textContent =
                `Event date: ${formatDate(eventDates[registration.event_name])}`;

            const registeredDate = document.createElement('p');

            if (registration.registration_date) {
                const date = new Date(registration.registration_date);

                registeredDate.textContent =
                    !Number.isNaN(date.getTime())
                        ? `Registration date: ${date.toLocaleDateString('en-IN')}`
                        : 'Registration date unavailable';
            } else {
                registeredDate.textContent =
                    'Registration date unavailable';
            }

            // Cancel registration button
            const cancelButton = document.createElement('button');

            cancelButton.type = 'button';
            cancelButton.textContent = 'Cancel Registration';

            cancelButton.addEventListener('click', async () => {
                const confirmed = confirm(
                    `Are you sure you want to cancel your registration for ${registration.event_name}?`
                );

                if (!confirmed) {
                    return;
                }

                cancelButton.disabled = true;
                cancelButton.textContent = 'Cancelling...';

                try {
                    const cancelResponse = await fetch(
                        `/api/registrations/${registration.id}`,
                        {
                            method: 'DELETE'
                        }
                    );

                    const cancelResult = await cancelResponse.json();

                    if (!cancelResponse.ok) {
                        alert(
                            cancelResult.message ||
                            'Could not cancel registration.'
                        );

                        cancelButton.disabled = false;
                        cancelButton.textContent = 'Cancel Registration';

                        return;
                    }

                    alert('Registration cancelled successfully!');

                    // Reload registrations and recalculate statistics
                    await loadRegistrations();

                } catch (error) {
                    console.error('Cancellation error:', error);

                    alert('Could not connect to the server.');

                    cancelButton.disabled = false;
                    cancelButton.textContent = 'Cancel Registration';
                }
            });

            card.appendChild(title);
            card.appendChild(name);
            card.appendChild(course);
            card.appendChild(eventDate);
            card.appendChild(registeredDate);
            card.appendChild(cancelButton);

            registrationsList.appendChild(card);
        });

    } catch (error) {
        console.error('Registrations error:', error);

        resetStatistics();

        registrationsStatus.textContent =
            'Could not connect to the server. Please try again.';
    }
}

// Logout student
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        logoutButton.disabled = true;
        logoutButton.textContent = 'Logging out...';

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });

            if (response.ok) {
                window.location.href = 'login.html';
            } else {
                alert('Logout failed. Please try again.');

                logoutButton.disabled = false;
                logoutButton.textContent = 'Logout';
            }

        } catch (error) {
            console.error('Logout error:', error);

            alert('Could not connect to the server.');

            logoutButton.disabled = false;
            logoutButton.textContent = 'Logout';
        }
    });
}

// Start dashboard
async function startDashboard() {
    resetStatistics();

    const loggedIn = await loadProfile();

    if (loggedIn) {
        await loadRegistrations();
    }
}

startDashboard();
