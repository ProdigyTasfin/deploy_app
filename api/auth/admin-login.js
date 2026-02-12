// api/auth/admin-login.js - FULLY FIXED
const { supabase } = require('../db'); // FIXED: Added destructuring
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    console.log('🔐 Admin login attempt:', email);

    // 1. Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // 2. Check if user is admin
    const isAdmin = user.role === 'admin' || 
                   user.role === 'Admin' ||
                   user.account_type === 'admin' || 
                   user.is_admin === true ||
                   user.user_type === 'admin' ||
                   user.email === 'admin@nibash.com' ||
                   user.email === 'admin@nibash.org' ||
                   user.email.includes('admin@');

    if (!isAdmin) {
      console.log('❌ Not an admin:', email, 'Role:', user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access only' 
      });
    }

    // 3. Verify password
    let isValid = false;

    // Check if password is hashed (bcrypt hash starts with $2)
    const isHashed = user.password && user.password.startsWith('$2');

    if (isHashed) {
      // Compare with bcrypt
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Plain text comparison (temporary fallback)
      isValid = password === user.password;
      
      // Auto-upgrade to hash for better security
      if (isValid && user.password) {
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id);
          console.log('✅ Upgraded admin password to hash for:', email);
        } catch (hashError) {
          console.error('Failed to hash password:', hashError);
        }
      }
    }

    if (!isValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // 4. Check if account is active/verified
    if (user.status === 'inactive' || user.status === 'suspended' || user.is_active === false) {
      console.log('❌ Account is not active:', email);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is not active. Please contact support.' 
      });
    }

    // 5. Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: 'admin',
        is_admin: true,
        user_id: user.id
      },
      process.env.JWT_SECRET || 'nibash-secret-2024',
      { expiresIn: '12h' }
    );

    // 6. Update last login timestamp
    try {
      await supabase
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (updateError) {
      console.error('Failed to update last login:', updateError);
      // Don't fail the login if this fails
    }

    // 7. Remove sensitive data from response
    const { password: _, ...safeUser } = user;

    // 8. Return success response
    console.log('✅ Admin login successful:', email);

    return res.status(200).json({
      success: true,
      user: {
        ...safeUser,
        isAdmin: true,
        permissions: ['manage_users', 'manage_professionals', 'view_reports', 'system_settings']
      },
      token,
      admin_access: true,
      redirectTo: '/admin/dashboard',
      expiresIn: '12h'
    });

  } catch (error) {
    console.error('❌ Admin login system error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error. Please try again later.' 
    });
  }
};
