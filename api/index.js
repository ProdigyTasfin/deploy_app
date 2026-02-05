// index.js - Vercel Serverless Function Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root
app.use(express.static(path.join(__dirname, '.')));

// API Routes
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/signup'));
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nibash-platform',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Serve HTML pages
const pages = [
  '/', '/login', '/admin', '/customer', '/professional', '/payment',
  '/payment-success', '/payment-failed', '/payment-cancel',
  '/customer-signup', '/professional-signup', '/profile', '/admin-login'
];

pages.forEach(page => {
  const file = page === '/' ? 'index.html' : `${page.slice(1)}.html`;
  app.get(page, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export for Vercel
module.exports = app;