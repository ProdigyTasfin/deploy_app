// api/auth/login.js - ENHANCED VERSION
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabase = createClient(
  'https://kohswrhxjvfygzrldyyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII'
);

// Rate limiting store (simple in-memory)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { email, password, role } = req.body;
    
    console.log('📥 Login attempt:', email);
    
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and role are required' 
      });
    }
    
    // ================= RATE LIMITING =================
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (loginAttempts.has(clientIp)) {
      const attempts = loginAttempts.get(clientIp);
      if (attempts.count >= MAX_ATTEMPTS && (now - attempts.firstAttempt) < LOCK_TIME) {
        return res.status(429).json({
          success: false,
          error: 'Too many login attempts. Try again in 15 minutes.'
        });
      }
    }
    
    // ================= CHECK HARDCODED USERS FIRST =================
    const hardcodedUsers = [
      {
        email: 'admin@nibash.com',
        password: 'admin123',
        userData: {
          id: 'ADMIN_001',
          email: 'admin@nibash.com',
          full_name: 'System Admin',
          role: 'admin',
          account_type: 'admin',
          status: 'active'
        }
      },
      {
        email: 'customer@example.com',
        password: 'customer123',
        userData: {
          id: 'CUSTOMER_001',
          email: 'customer@example.com',
          full_name: 'Demo Customer',
          role: 'customer',
          account_type: 'customer',
          status: 'active'
        }
      },
      {
        email: 'professional@example.com',
        password: 'professional123',
        userData: {
          id: 'PROFESSIONAL_001',
          email: 'professional@example.com',
          full_name: 'Demo Professional',
          role: 'professional',
          account_type: 'professional',
          status: 'approved'
        }
      },
      {
        email: 'tasfinhasansakib165@gmail.com',
        password: 'test123',
        userData: {
          id: 'USER_001',
          email: 'tasfinhasansakib165@gmail.com',
          full_name: 'Tasfin Hasan Sakib',
          role: 'customer',
          account_type: 'customer',
          status: 'active'
        }
      }
    ];
    
    // Check hardcoded users
    const hardcodedUser = hardcodedUsers.find(u => 
      u.email === email && 
      u.password === password
    );
    
    if (hardcodedUser) {
      // Check role match
      if (role && hardcodedUser.userData.role !== role) {
        if (!loginAttempts.has(clientIp)) {
          loginAttempts.set(clientIp, { count: 1, firstAttempt: now });
        } else {
          loginAttempts.get(clientIp).count += 1;
        }
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials for this role' 
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          id: hardcodedUser.userData.id,
          email: hardcodedUser.userData.email,
          role: hardcodedUser.userData.role,
          name: hardcodedUser.userData.full_name
        },
        process.env.JWT_SECRET || 'nibash-secret-key-2024',
        { expiresIn: '24h' }
      );
      
      // Reset attempts on success
      loginAttempts.delete(clientIp);
      
      return res.json({
        success: true,
        user: hardcodedUser.userData,
        token: token,
        redirectTo: getDashboardUrl(hardcodedUser.userData.role)
      });
    }
    
    // ================= CHECK SUPABASE =================
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', role)
        .limit(1);
      
      if (error) throw error;
      
      if (!users || users.length === 0) {
        // Track failed attempt
        if (!loginAttempts.has(clientIp)) {
          loginAttempts.set(clientIp, { count: 1, firstAttempt: now });
        } else {
          loginAttempts.get(clientIp).count += 1;
        }
        
        // Delay response to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 1000));
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }
      
      const user = users[0];
      
      // Check password
      let isValidPassword = false;
      if (user.password && user.password.length > 30) {
        // Likely hashed password
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Plain text password
        isValidPassword = password === user.password;
      }
      
      if (!isValidPassword) {
        // Track failed attempt
        if (!loginAttempts.has(clientIp)) {
          loginAttempts.set(clientIp, { count: 1, firstAttempt: now });
        } else {
          loginAttempts.get(clientIp).count += 1;
        }
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }
      
      // Check account status
      if (user.status !== 'active' && user.status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: `Account is ${user.status}. Please contact support.`
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.full_name
        },
        process.env.JWT_SECRET || 'nibash-secret-key-2024',
        { expiresIn: '24h' }
      );
      
      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);
      
      // Reset attempts on success
      loginAttempts.delete(clientIp);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({
        success: true,
        user: userWithoutPassword,
        token: token,
        redirectTo: getDashboardUrl(user.role)
      });
      
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Fallback to hardcoded users
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

function getDashboardUrl(role) {
  switch(role) {
    case 'admin':
      return '/admin.html';
    case 'professional':
      return '/professional.html';
    case 'customer':
    default:
      return '/customer.html';
  }
}