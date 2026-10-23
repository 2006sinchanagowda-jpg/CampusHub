const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Detect production mode when deployed
const isProduction = process.env.NODE_ENV === 'production';

// Security: HTTP headers
app.use(helmet());

// Request body size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '10kb'
}));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
    throw new Error(
        'SESSION_SECRET must be configured before production deployment.'
    );
}

app.use(session({
    name: 'campus.sid',
    secret: sessionSecret || 'local-development-secret-change-before-deployment',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Check whether a student is logged in
function requireStudent(req, res, next) {
    if (!req.session || !req.session.student) {
        return res.status(401).json({
            success: false,
            message: 'Please log in first.'
        });
    }

    next();
}

// Test database connection
app.get('/api/test-db', (req, res) => {
    db.query('SELECT 1 AS connected', (err, results) => {
        if (err) {
            console.error('Database test failed:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Database connection failed.'
            });
        }

        res.json({
            success: true,
            message: 'MySQL connected successfully!',
            data: results
        });
    });
});

// Student account registration
app.post('/api/auth/register', async (req, res) => {
    const { studentName, email, password } = req.body;

    if (
        typeof studentName !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide your name, email, and password.'
        });
    }

    const name = studentName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
        !name ||
        name.length > 100 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid name and email.'
        });
    }

    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({
            success: false,
            message: 'Password must be 8–72 characters long.'
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.query(
            `INSERT INTO students
             (student_name, email, password_hash)
             VALUES (?, ?, ?)`,
            [name, normalizedEmail, passwordHash],
            (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            message: 'An account with this email already exists.'
                        });
                    }

                    console.error(
                        'Student registration failed:',
                        err.message
                    );

                    return res.status(500).json({
                        success: false,
                        message: 'Could not create the account.'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Account created successfully!',
                    studentId: result.insertId
                });
            }
        );
    } catch (error) {
        console.error('Password hashing failed:', error.message);

        res.status(500).json({
            success: false,
            message: 'Could not process registration.'
        });
    }
});

// Student login
app.post('/api/auth/login', (req, res, next) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password ||
        password.length > 72
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email and password.'
        });
    }

    db.query(
        `SELECT id, student_name, email, password_hash
         FROM students
         WHERE email = ?`,
        [email.trim().toLowerCase()],
        async (err, results) => {
            if (err) {
                console.error('Login lookup failed:', err.message);

                return res.status(500).json({
                    success: false,
                    message: 'Login could not be completed.'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            try {
                const student = results[0];

                const passwordMatches = await bcrypt.compare(
                    password,
                    student.password_hash
                );

                if (!passwordMatches) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid email or password.'
                    });
                }

                // Regenerate session ID after successful login
                req.session.regenerate((sessionError) => {
                    if (sessionError) {
                        return next(sessionError);
                    }

                    req.session.student = {
                        id: student.id,
                        name: student.student_name,
                        email: student.email
                    };

                    req.session.save((saveError) => {
                        if (saveError) {
                            return next(saveError);
                        }

                        res.json({
                            success: true,
                            message: 'Login successful!',
                            student: req.session.student
                        });
                    });
                });
            } catch (error) {
                console.error(
                    'Password verification failed:',
                    error.message
                );

                res.status(500).json({
                    success: false,
                    message: 'Login could not be completed.'
                });
            }
        }
    );
});

// Get current logged-in student
app.get('/api/auth/me', requireStudent, (req, res) => {
    res.json({
        success: true,
        student: req.session.student
    });
});

// Student logout
app.post('/api/auth/logout', requireStudent, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }

        res.clearCookie('campus.sid', {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction
        });

        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

// Register a student for an event
app.post('/api/register', requireStudent, (req, res) => {
    const { eventName, course } = req.body;
    const student = req.session.student;

    if (
        typeof eventName !== 'string' ||
        typeof course !== 'string'
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please provide the event name and course.'
        });
    }

    const allowedEvents = [
        'Cultural Fest',
        'Technical Workshop',
        'Sports Day'
    ];

    const allowedCourses = [
        'BCA',
        'BSc',
        'BCom',
        'BA',
        'BBA',
        'Other'
    ];

    if (!allowedEvents.includes(eventName.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Please select a valid event.'
        });
    }

    if (!allowedCourses.includes(course.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Please select a valid course.'
        });
    }

    const sql = `
        INSERT INTO student_registrations
        (event_name, student_name, email, student_id, course)
        VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
        eventName.trim(),
        student.name,
        student.email,
        String(student.id),
        course.trim()
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Event registration failed:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Could not save event registration.'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Event registration saved successfully!',
            registrationId: result.insertId
        });
    });
});

// Get registrations for the logged-in student only
app.get('/api/registrations', requireStudent, (req, res) => {
    const student = req.session.student;

    const sql = `
        SELECT id, student_name, course, event_name, registration_date
        FROM student_registrations
        WHERE email = ?
        ORDER BY registration_date DESC
    `;

    db.query(sql, [student.email], (err, results) => {
        if (err) {
            console.error(
                'Could not retrieve registrations:',
                err.message
            );

            return res.status(500).json({
                success: false,
                message: 'Could not retrieve registrations.'
            });
        }

        res.json({
            success: true,
            registrations: results
        });
    });
});

// Cancel a registration belonging to the logged-in student
app.delete('/api/registrations/:id', requireStudent, (req, res) => {
    const registrationId = Number(req.params.id);

    if (
        !Number.isSafeInteger(registrationId) ||
        registrationId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Invalid registration ID.'
        });
    }

    const student = req.session.student;

    const sql = `
        DELETE FROM student_registrations
        WHERE id = ? AND email = ?
    `;

    db.query(
        sql,
        [registrationId, student.email],
        (err, result) => {
            if (err) {
                console.error('Cancellation failed:', err.message);

                return res.status(500).json({
                    success: false,
                    message: 'Could not cancel the registration.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Registration not found.'
                });
            }

            res.json({
                success: true,
                message: 'Registration cancelled successfully!'
            });
        }
    );
});

// Handle unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});