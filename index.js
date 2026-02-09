// index.js - For local development only
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Add robots.txt handler (dynamic, no file needed)
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /

# Block API endpoints
Disallow: /api/

# Block admin pages
Disallow: /admin.html
Disallow: /admin-login.html`);
});

// API routes (keep existing)
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));
app.use('/api/payment/lookup', require('./api/payment/lookup'));
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/signup'));
app.use('/api/auth/me', require('./api/auth/me'));
app.use('/api/login', require('./api/login'));
app.use('/api/signup', require('./api/signup'));
app.use('/api/payments/create', require('./api/payments/create'));
app.use('/api/services/create', require('./api/services/create'));
app.use('/api/services/list', require('./api/services/list'));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Nibash API is working locally!', timestamp: new Date().toISOString() });
});

// Serve HTML files with 404 handling for missing assets
app.get('*', (req, res) => {
    const filePath = req.path === '/' ? '/index.html' : req.path;
    const fullPath = path.join(__dirname, filePath);
    
    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // File doesn't exist - check if it's one of the missing assets
            if (filePath.includes('.css') || filePath.includes('.js') || filePath.includes('.png') || filePath.includes('.jpg')) {
                // Return 404 for missing assets
                res.status(404).send('File not found');
                console.log(`Missing asset: ${filePath}`);
                return;
            }
            // For HTML files, serve index.html (SPA behavior)
            if (filePath.endsWith('.html')) {
                res.sendFile(path.join(__dirname, '/index.html'));
                return;
            }
        }
        // File exists, serve it
        res.sendFile(fullPath);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`Robots.txt: http://localhost:${PORT}/robots.txt`);
});