// index.js - For local development only
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// API routes
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/signup'));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Nibash API is working locally!', timestamp: new Date().toISOString() });
});

// Serve HTML files
app.get('*', (req, res) => {
    const filePath = req.path === '/' ? '/index.html' : req.path;
    res.sendFile(path.join(__dirname, filePath));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API test endpoint: http://localhost:${PORT}/api/test`);
});
