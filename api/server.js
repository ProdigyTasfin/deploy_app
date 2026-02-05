// server.js - Main Production Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ================= SECURITY MIDDLEWARE =================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://sandbox.sslcommerz.com"]
    }
  }
}));

// ================= RATE LIMITING =================
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts'
});

// ================= CORS =================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://localhost:5173',
  'https://yourdomain.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ================= BODY PARSING =================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, '.'), {
  setHeaders: (res, filepath) => {
    const ext = path.extname(filepath);
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (ext === '.js' || ext === '.css') {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// ================= ROUTES =================

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// API Routes
app.use('/api/auth/login', require('./api/auth/login'));
app.use('/api/auth/signup', require('./api/auth/signup'));
app.use('/api/payment/initiate', require('./api/payment/initiate'));
app.use('/api/payment/validate', require('./api/payment/validate'));
app.use('/api/test', require('./api/test'));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: error ? 'disconnected' : 'connected',
      services: {
        authentication: 'active',
        payment: 'active',
        database: error ? 'inactive' : 'active'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// HTML Routes
const htmlRoutes = [
  { path: '/', file: 'index.html' },
  { path: '/login', file: 'login.html' },
  { path: '/admin', file: 'admin.html' },
  { path: '/customer', file: 'customer.html' },
  { path: '/professional', file: 'professional.html' },
  { path: '/payment', file: 'payment.html' },
  { path: '/payment-success', file: 'payment-success.html' },
  { path: '/payment-failed', file: 'payment-failed.html' },
  { path: '/payment-cancel', file: 'payment-cancel.html' },
  { path: '/customer-signup', file: 'customer-signup.html' },
  { path: '/professional-signup', file: 'professional-signup.html' },
  { path: '/profile', file: 'profile.html' },
  { path: '/admin-login', file: 'admin-login.html' }
];

htmlRoutes.forEach(route => {
  app.get(route.path, (req, res) => {
    res.sendFile(path.join(__dirname, route.file));
  });
});

// ================= DATABASE INITIALIZATION =================
async function initializeDatabase() {
  try {
    // Check if admin user exists, create if not
    const { data: admin } = await supabase
      .from('users')
      .select('*')
      .eq('email', process.env.ADMIN_EMAIL || 'admin@nibash.com')
      .single();
    
    if (!admin) {
      console.log('👨‍💼 Creating admin user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_INITIAL_PASSWORD || 'admin123', 
        12
      );
      
      const { error } = await supabase
        .from('users')
        .insert([{
          email: process.env.ADMIN_EMAIL || 'admin@nibash.com',
          password: hashedPassword,
          full_name: 'System Administrator',
          role: 'admin',
          account_type: 'admin',
          status: 'active',
          is_email_verified: true,
          created_at: new Date().toISOString()
        }]);
      
      if (error) {
        console.error('❌ Failed to create admin:', error.message);
      } else {
        console.log('✅ Admin user created successfully');
        console.log('📧 Email:', process.env.ADMIN_EMAIL || 'admin@nibash.com');
        console.log('🔑 Password:', process.env.ADMIN_INITIAL_PASSWORD || 'admin123');
      }
    }
    
    // Create default service categories if they don't exist
    const { data: categories } = await supabase
      .from('service_categories')
      .select('*');
    
    if (!categories || categories.length === 0) {
      console.log('🔧 Creating default service categories...');
      
      const defaultCategories = [
        { name: 'বৈদ্যুতিক কাজ', icon: '⚡', active: true },
        { name: 'প্লাম্বিং', icon: '🔧', active: true },
        { name: 'রং করার কাজ', icon: '🎨', active: true },
        { name: 'এসি সার্ভিস', icon: '❄️', active: true },
        { name: 'কাঠের কাজ', icon: '🪚', active: true },
        { name: 'গৃহস্থালি মেরামত', icon: '🏠', active: true }
      ];
      
      await supabase
        .from('service_categories')
        .insert(defaultCategories);
      
      console.log('✅ Service categories created');
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// ================= ERROR HANDLING =================
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    suggestion: 'Check the API documentation or contact support'
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong. Please try again later.' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`
  🚀 NIBASH PLATFORM LAUNCHED SUCCESSFULLY!
  =========================================
  
  📍 Server URL: http://localhost:${PORT}
  🔐 Environment: ${process.env.NODE_ENV || 'development'}
  ⚡ Node Version: ${process.version}
  
  📊 SYSTEM STATUS:
  • API Server: ✅ RUNNING
  • Database: 🔄 CONNECTING...
  • Security: ✅ ENABLED
  • Payment Gateway: ${process.env.SSLCOMMERZ_STORE_ID ? '✅ CONFIGURED' : '⚠️ SANDBOX MODE'}
  
  🎯 AVAILABLE ENDPOINTS:
  • Home: http://localhost:${PORT}/
  • API Health: http://localhost:${PORT}/api/health
  • Customer Dashboard: http://localhost:${PORT}/customer
  • Professional Dashboard: http://localhost:${PORT}/professional
  • Admin Dashboard: http://localhost:${PORT}/admin
  
  🔧 API ENDPOINTS:
  • POST /api/auth/login
  • POST /api/auth/signup
  • POST /api/payment/initiate
  • POST /api/payment/validate
  
  👤 DEFAULT CREDENTIALS:
  • Admin: admin@nibash.com / admin123
  • Customer: customer@example.com / customer123
  • Professional: professional@example.com / professional123
  
  =========================================
  Initializing database...
  `);
  
  // Initialize database
  await initializeDatabase();
});

module.exports = app;