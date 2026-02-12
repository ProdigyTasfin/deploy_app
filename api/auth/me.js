// api/auth/me.js - FIXED VERSION
const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization token required' 
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'nibash-secret-key-2024'
    );

    // Validate decoded token has required fields
    if (!decoded.id && !decoded.user_id && !decoded.auth_user_id) {
      console.error('❌ Invalid token structure:', decoded);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
    }

    // Get user ID from token (handle different field names)
    const userId = decoded.id || decoded.user_id;
    const authUserId = decoded.auth_user_id;

    console.log(`🔐 Session check for user ID: ${userId || authUserId}`);

    // Try to fetch user by ID first, then by auth_user_id if needed
    let user = null;
    let error = null;

    if (userId) {
      // Fetch user by ID with maybeSingle() instead of single()
      const result = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      user = result.data;
      error = result.error;
    }

    // If not found by ID and we have auth_user_id, try that
    if (!user && authUserId) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      
      user = result.data;
      error = result.error;
    }

    // If still not found, try by email from decoded token
    if (!user && decoded.email) {
      const result = await supabase
        .from('users')
        .select('*')
        .eq('email', decoded.email.toLowerCase())
        .maybeSingle();
      
      user = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }

    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session - user not found' 
      });
    }

    // Check if account is active
    if (user.status && !['active', 'approved', 'verified'].includes(user.status)) {
      console.log(`❌ Account ${user.status} for: ${user.email}`);
      return res.status(403).json({ 
        success: false, 
        error: `Account is ${user.status}. Please contact support.`,
        accountStatus: user.status 
      });
    }

    // Update last activity timestamp (optional)
    try {
      await supabase
        .from('users')
        .update({ 
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (updateError) {
      console.error('Failed to update last activity:', updateError);
      // Don't fail the request if this fails
    }

    // Get Supabase session if available
    let session = null;
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      session = supabaseSession;
    } catch (sessionError) {
      // Ignore session errors
    }

    // Remove sensitive data
    const { 
      password, 
      password_hash, 
      reset_token, 
      verification_token, 
      ...userWithoutSensitive 
    } = user;

    // Add computed fields
    const userResponse = {
      ...userWithoutSensitive,
      displayName: user.full_name || user.email.split('@')[0],
      isAdmin: user.role === 'admin',
      isProfessional: user.role === 'professional',
      isCustomer: user.role === 'customer',
      initials: user.full_name 
        ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : user.email.substring(0, 2).toUpperCase()
    };

    console.log(`✅ Session validated for: ${user.email} (${user.role})`);

    return res.status(200).json({ 
      success: true, 
      user: userResponse,
      session: session || null,
      authenticated: true,
      tokenValid: true
    });

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      console.log('❌ Token expired');
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired',
        expired: true 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Invalid token signature');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    if (error.name === 'NotBeforeError') {
      console.log('❌ Token not active yet');
      return res.status(401).json({ 
        success: false, 
        error: 'Token not active yet' 
      });
    }

    console.error('❌ Token verification error:', error.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};
