// api/auth/login.js - FIXED VERSION
const jwt = require('jsonwebtoken');
const { supabase } = require('../db'); // FIXED: Added destructuring

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
    const { email, password, role } = req.body || {};
    
    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and role are required' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'professional', 'customer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role specified' 
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`🔐 Login attempt: ${normalizedEmail} as ${role}`);

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (authError || !authData?.user) {
      console.log(`❌ Auth failed for: ${normalizedEmail}`, authError?.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // 2. Get user profile from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, auth_user_id, email, full_name, phone, role, status, address, created_at, avatar_url, is_verified')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle(); // Changed from .single() to .maybeSingle()

    if (userError) {
      console.error(`❌ Database error for: ${normalizedEmail}`, userError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }

    if (!user) {
      console.log(`❌ No profile found for auth user: ${normalizedEmail}`);
      
      // Optional: Auto-create profile if it doesn't exist
      // This is useful if you're using Supabase Auth but haven't created the profile yet
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            auth_user_id: authData.user.id,
            email: normalizedEmail,
            role: role,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
          
        if (!createError && newUser) {
          console.log(`✅ Auto-created profile for: ${normalizedEmail}`);
          user = newUser;
        } else {
          return res.status(401).json({ 
            success: false, 
            error: 'Account profile not found' 
          });
        }
      } catch (createErr) {
        return res.status(401).json({ 
          success: false, 
          error: 'Account profile not found' 
        });
      }
    }

    // 3. Verify role matches
    if (user.role !== role) {
      console.log(`❌ Role mismatch for: ${normalizedEmail} - Expected: ${role}, Found: ${user.role}`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      }); // Use generic message for security
    }

    // 4. Check account status
    if (!['active', 'approved', 'verified'].includes(user.status)) {
      console.log(`❌ Account ${user.status} for: ${normalizedEmail}`);
      return res.status(403).json({ 
        success: false, 
        error: `Account is ${user.status}. Please contact support.`, 
        accountStatus: user.status 
      });
    }

    // 5. Update last login timestamp
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

    // 6. Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        auth_user_id: user.auth_user_id, 
        email: user.email, 
        role: user.role,
        is_admin: user.role === 'admin',
        user_id: user.id
      },
      process.env.JWT_SECRET || 'nibash-secret-key-2024',
      { expiresIn: '24h' }
    );

    // 7. Get Supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // 8. Remove sensitive data from response
    const { password_hash, ...safeUser } = user;

    // 9. Determine redirect based on role
    let redirectTo = '/dashboard';
    if (user.role === 'admin') {
      redirectTo = '/admin/dashboard';
    } else if (user.role === 'professional') {
      redirectTo = '/professional/dashboard';
    } else if (user.role === 'customer') {
      redirectTo = '/customer/dashboard';
    }

    console.log(`✅ Login successful: ${normalizedEmail} as ${user.role}`);

    // 10. Return success response
    return res.status(200).json({
      success: true,
      user: {
        id: safeUser.id,
        auth_user_id: safeUser.auth_user_id,
        email: safeUser.email,
        full_name: safeUser.full_name,
        displayName: safeUser.full_name || safeUser.email.split('@')[0],
        phone: safeUser.phone,
        role: safeUser.role,
        status: safeUser.status,
        address: safeUser.address,
        avatar_url: safeUser.avatar_url,
        isAdmin: safeUser.role === 'admin',
        isVerified: safeUser.is_verified || false,
        createdAt: safeUser.created_at
      },
      token,
      session: session || null,
      redirectTo,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('❌ Login system error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error. Please try again later.' 
    });
  }
};
