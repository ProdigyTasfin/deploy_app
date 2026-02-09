// index.js - For local development only
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// BLOCK bot/scanner requests
app.use((req, res, next) => {
  const blockedPaths = [
    '/js/lkk_ch.js',
    '/js/twint_ch.js', 
    '/css/support_parent.css',
    '/wp-', // All WordPress scans
    '/adminer',
    '/phpmyadmin',
    '/.env',
    '/config.json'
  ];
  
  if (blockedPaths.some(path => req.path.includes(path))) {
    console.log(`Blocked scan: ${req.path} - ${req.get('user-agent') || 'No UA'}`);
    return res.status(404).send('Not found');
  }
  
  next();
});

// Serve static files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Dynamic robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /`);
});

// API routes (keep existing)
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));
app.use('/api/payment/lookup', require('./api/payment/lookup'));
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/login'));
app.use('/api/auth/me', require('./api/auth/login'));
app.use('/api/login', require('./api/login'));
app.use('/api/signup', require('./api/signup'));
app.use('/api/payments/create', require('./api/payments/create'));
app.use('/api/services/create', require('./api/services/create'));
app.use('/api/services/list', require('./api/services/list'));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Nibash API is working!', 
    timestamp: new Date().toISOString(),
    status: 'operational'
  });
});

// Serve HTML files
app.get('*', (req, res) => {
  const filePath = req.path === '/' ? '/index.html' : req.path;
  res.sendFile(path.join(__dirname, filePath), (err) => {
    if (err) {
      // For missing HTML files, serve index.html (SPA fallback)
      if (filePath.endsWith('.html')) {
        res.sendFile(path.join(__dirname, '/index.html'));
      } else {
        res.status(404).send('Page not found');
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API test: http://localhost:${PORT}/api/test`);
  console.log(`Robots: http://localhost:${PORT}/robots.txt`);
  console.log(`Bot protection active`);
});