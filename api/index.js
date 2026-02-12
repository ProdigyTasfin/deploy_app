// index.js - Vercel Serverless Function Entry Point - FIXED VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

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

// ========== FIXED: API Routes with proper error handling ==========

// Auth routes
try {
  app.use('/api/auth/login', require('./api/auth/login'));
  console.log('✅ Route loaded: /api/auth/login');
} catch (err) {
  console.error('❌ Failed to load /api/auth/login:', err.message);
}

try {
  app.use('/api/auth/register', require('./api/auth/register'));
  console.log('✅ Route loaded: /api/auth/register');
} catch (err) {
  console.error('❌ Failed to load /api/auth/register:', err.message);
}

try {
  app.use('/api/auth/me', require('./api/auth/me'));
  console.log('✅ Route loaded: /api/auth/me');
} catch (err) {
  console.error('❌ Failed to load /api/auth/me:', err.message);
}

try {
  app.use('/api/auth/admin-login', require('./api/auth/admin-login'));
  console.log('✅ Route loaded: /api/auth/admin-login');
} catch (err) {
  console.error('❌ Failed to load /api/auth/admin-login:', err.message);
}

// Payment routes
try {
  app.use('/api/payment/initiate', require('./api/payment/initiate'));
  console.log('✅ Route loaded: /api/payment/initiate');
} catch (err) {
  console.error('❌ Failed to load /api/payment/initiate:', err.message);
}

try {
  app.use('/api/payment/validate', require('./api/payment/validate'));
  console.log('✅ Route loaded: /api/payment/validate');
} catch (err) {
  console.error('❌ Failed to load /api/payment/validate:', err.message);
}

try {
  app.use('/api/payment/webhook', require('./api/payment/webhook'));
  console.log('✅ Route loaded: /api/payment/webhook');
} catch (err) {
  console.error('❌ Failed to load /api/payment/webhook:', err.message);
}

// User routes
try {
  app.use('/api/users', require('./api/users'));
  console.log('✅ Route loaded: /api/users');
} catch (err) {
  console.error('❌ Failed to load /api/users:', err.message);
}

// Professionals routes
try {
  app.use('/api/professionals', require('./api/professionals'));
  console.log('✅ Route loaded: /api/professionals');
} catch (err) {
  console.error('❌ Failed to load /api/professionals:', err.message);
}

// ========== FIXED: Health check with database verification ==========
app.get('/api/health', async (req, res) => {
  try {
    // Try to check database connection
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      const { checkDatabaseConnection } = require('./api/db');
      const dbCheck = await checkDatabaseConnection();
      dbStatus = dbCheck.connected ? 'connected' : 'disconnected';
      dbError = dbCheck.error;
    } catch (dbErr) {
      dbStatus = 'error';
      dbError = dbErr.message;
    }
    
    res.json({
      success: true,
      status: 'healthy',
      service: 'nibash-platform',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        error: dbError
      },
      vercel: process.env.VERCEL ? true : false,
      region: process.env.VERCEL_REGION || 'local'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== FIXED: Serve HTML pages with existence check ==========

// Define page mappings
const pageMappings = [
  { route: '/', file: 'index.html' },
  { route: '/login', file: 'login.html' },
  { route: '/admin', file: 'admin.html' },
  { route: '/admin-login', file: 'admin-login.html' },
  { route: '/admin/dashboard', file: 'admin-dashboard.html' },
  { route: '/customer', file: 'customer.html' },
  { route: '/customer/dashboard', file: 'customer-dashboard.html' },
  { route: '/professional', file: 'professional.html' },
  { route: '/professional/dashboard', file: 'professional-dashboard.html' },
  { route: '/payment', file: 'payment.html' },
  { route: '/payment-success', file: 'payment-success.html' },
  { route: '/payment-failed', file: 'payment-failed.html' },
  { route: '/payment-cancel', file: 'payment-cancel.html' },
  { route: '/customer-signup', file: 'customer-signup.html' },
  { route: '/professional-signup', file: 'professional-signup.html' },
  { route: '/profile', file: 'profile.html' },
  { route: '/dashboard', file: 'dashboard.html' },
  { route: '/pending-approval', file: 'pending-approval.html' },
  { route: '/mock-payment', file: 'mock-payment.html' }
];

// Serve HTML pages if they exist
pageMappings.forEach(({ route, file }) => {
  const filePath = path.join(__dirname, file);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    app.get(route, (req, res) => {
      res.sendFile(filePath);
    });
    console.log(`✅ Page route: ${route} -> ${file}`);
  } else {
    console.warn(`⚠️ Page not found: ${file} for route ${route}`);
    
    // Optional: Create fallback route
    app.get(route, (req, res) => {
      res.status(404).send(`<html><body><h1>404 - Page Not Found</h1><p>The requested page ${file} does not exist.</p><a href="/">Go Home</a></body></html>`);
    });
  }
});

// ========== FIXED: API documentation endpoint ==========
app.get('/api', (req, res) => {
  res.json({
    name: 'Nibash Platform API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      { path: '/api/health', methods: ['GET'] },
      { path: '/api/auth/login', methods: ['POST'] },
      { path: '/api/auth/register', methods: ['POST'] },
      { path: '/api/auth/me', methods: ['GET'] },
      { path: '/api/auth/admin-login', methods: ['POST'] },
      { path: '/api/payment/initiate', methods: ['POST'] },
      { path: '/api/payment/validate', methods: ['POST', 'GET'] },
      { path: '/api/payment/webhook', methods: ['POST'] },
      { path: '/api/users', methods: ['GET', 'PUT'] },
      { path: '/api/professionals', methods: ['GET'] }
    ],
    documentation: 'https://github.com/yourusername/nibash-platform',
    timestamp: new Date().toISOString()
  });
});

// ========== FIXED: 404 handler with better UX ==========
app.use((req, res) => {
  // Check if it's an API route
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }
  
  // For non-API routes, try to send custom 404 page or fallback to index
  const notFoundPath = path.join(__dirname, '404.html');
  
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
  }
});

// ========== FIXED: Global error handler ==========
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Check if it's an API route
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      path: req.path
    });
  }
  
  // For non-API routes
  res.status(500).send(`
    <html>
      <head><title>500 - Server Error</title></head>
      <body>
        <h1>500 - Internal Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
        <a href="/">Go Home</a>
      </body>
    </html>
  `);
});

// ========== FIXED: Export for Vercel ==========
module.exports = app;

// ========== FIXED: Local development server ==========
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`
    🚀 Nibash Platform Server
    ================================
    📡 Server: http://localhost:${port}
    🔧 Environment: ${process.env.NODE_ENV || 'development'}
    📁 Static files: ${__dirname}
    ================================
    `);
    
    // Log available routes
    console.log('📋 Available Routes:');
    console.log('  - GET  /api/health');
    console.log('  - POST /api/auth/login');
    console.log('  - POST /api/auth/register');
    console.log('  - GET  /api/auth/me');
    console.log('  - POST /api/auth/admin-login');
    console.log('  - POST /api/payment/initiate');
    console.log('  - POST /api/payment/validate');
    console.log('  - GET  /api');
    console.log('  - GET  /* (HTML pages)');
    console.log('===============================');
  });
}
