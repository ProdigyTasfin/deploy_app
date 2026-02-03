const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Nibash API is working!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'nibash-api' });
});

// Handle all other routes
app.all('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;
