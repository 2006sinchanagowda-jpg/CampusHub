const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

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

// Register a student for an event
app.post('/api/register', (req, res) => {
    const {
        eventName,
        studentName,
        email,
        studentId,
        course
    } = req.body;

    if (
        !eventName?.trim() ||
        !studentName?.trim() ||
        !email?.trim() ||
        !studentId?.trim() ||
        !course?.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: 'Please fill in all the fields.'
        });
    }

    const sql = `
        INSERT INTO student_registrations
        (event_name, student_name, email, student_id, course)
        VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
        eventName.trim(),
        studentName.trim(),
        email.trim(),
        studentId.trim(),
        course.trim()
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Registration failed:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Could not save registration.'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Registration saved successfully!',
            registrationId: result.insertId
        });
    });
});

// Get all student registrations
app.get('/api/registrations', (req, res) => {
    const sql = `
        SELECT
            id,
            student_name,
            email,
            student_id,
            course,
            event_name,
            registration_date
        FROM student_registrations
        ORDER BY registration_date DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Could not retrieve registrations:', err.message);

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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
