// api/auth/login.js - SECURE VERSION
const { supabase } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { email, password, role } = req.body || {};
    
    // Validation
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and role are required'
      });
    }
    
    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Input validation
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }
    
    if (!['customer', 'professional', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }
    
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();
    
    if (error || !user) {
      // Generic error for security (don't reveal if user exists)
      console.log('Login failed: User not found or database error');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    // Verify role
    if (user.role !== role) {
      console.log(`Login failed: Role mismatch. User role: ${user.role}, Requested role: ${role}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    // ========== SECURITY FIX ==========
    // Check if password is already hashed
    const isHashedPassword = typeof user.password === 'string' && 
                             (user.password.startsWith('$2a$') || 
                              user.password.startsWith('$2b$') || 
                              user.password.startsWith('$2y$'));
    
    let isValidPassword = false;
    
    if (isHashedPassword) {
      // Compare with bcrypt hash
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Password is not hashed (legacy users)
      console.warn(`⚠️ User ${user.email} has unhashed password - upgrading`);
      isValidPassword = password === user.password;
      
      // If password matches, upgrade to hash
      if (isValidPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update password in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            password: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Failed to hash user password:', updateError);
        } else {
          console.log(`✅ Upgraded password hash for user: ${user.email}`);
        }
      }
    }
    
    if (!isValidPassword) {
      console.log(`Login failed: Invalid password for ${user.email}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    // Check account status
    if (!['active', 'approved'].includes(user.status)) {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact support.`,
        accountStatus: user.status
      });
    }
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'nibash-secret-key-2024';
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        account_type: user.account_type || user.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    // Prepare response without sensitive data
    const { 
      password: _ignoredPassword, 
      password_hash: _ignoredHash,
      ...safeUserData 
    } = user;
    
    // Add additional safe fields
    const responseUser = {
      ...safeUserData,
      displayName: user.full_name || user.name || user.email.split('@')[0],
      isAdmin: user.role === 'admin',
      permissions: getPermissions(user.role)
    };
    
    // Log successful login (without password)
    console.log(`✅ Login successful: ${user.email} (${user.role})`);
    
    return res.json({
      success: true,
      user: responseUser,
      token,
      redirectTo: getDashboardUrl(user.role),
      expiresIn: '24h'
    });
    
  } catch (error) {
    console.error('Login system error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function getDashboardUrl(role) {
  switch (role) {
    case 'admin':
      return '/admin.html';
    case 'professional':
      return '/professional.html';
    case 'customer':
    default:
      return '/customer.html';
  }
}

function getPermissions(role) {
  const basePermissions = ['view_profile', 'update_profile'];
  
  switch (role) {
    case 'admin':
      return [...basePermissions, 'manage_users', 'view_reports', 'manage_services', 'access_admin'];
    case 'professional':
      return [...basePermissions, 'manage_services', 'view_assigned_jobs', 'update_service_status'];
    case 'customer':
      return [...basePermissions, 'request_services', 'view_own_services', 'make_payments'];
    default:
      return basePermissions;
  }
}