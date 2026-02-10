// index.js - Express app entry (Node runtime)
require('dotenv').config();
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
    '/wp-',
    '/adminer',
    '/phpmyadmin',
    '/.env',
    '/config.json'
  ];

  if (blockedPaths.some((blockedPath) => req.path.includes(blockedPath))) {
    console.log(`Blocked scan: ${req.path} - ${req.get('user-agent') || 'No UA'}`);
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /');
});

// API routes
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));
app.use('/api/payment/lookup', require('./api/payment/lookup'));
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/signup'));
app.use('/api/auth/me', require('./api/auth/me'));
app.use('/api/auth/admin-login', require('./api/auth/admin-login'));
app.use('/api/payments/create', require('./api/payments/create'));
app.use('/api/services/create', require('./api/services/create'));
app.use('/api/services/list', require('./api/services/list'));
app.use('/api/admin/users', require('./api/admin/users'));

// Compatibility aliases (return JSON, avoid HTML fallthrough)
app.post('/api/signup', (req, res, next) => require('./api/auth/signup')(req, res, next));
app.post('/api/login', (req, res, next) => require('./api/auth/login')(req, res, next));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Nibash API is working!', timestamp: new Date().toISOString(), status: 'operational' });
});

// Explicit API 404 (JSON only)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// HTML/static fallback for non-API paths
app.get('*', (req, res) => {
  const filePath = req.path === '/' ? '/index.html' : req.path;
  res.sendFile(path.join(__dirname, filePath), (err) => {
    if (err) {
      if (filePath.endsWith('.html')) {
        res.sendFile(path.join(__dirname, '/index.html'));
      } else {
        res.status(404).send('Page not found');
      }
    }
  });
});

// Global error handler (JSON for API, text/html fallback for pages)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
  return res.status(500).send('Internal server error');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API test: http://localhost:${PORT}/api/test`);
    console.log(`Robots: http://localhost:${PORT}/robots.txt`);
    console.log('Bot protection active');
  });
}

module.exports = app;
