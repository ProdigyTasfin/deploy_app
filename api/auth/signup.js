// api/auth/register.js - FIXED VERSION
const { supabase, supabaseAdmin } = require('../db');

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
    // --- Normalize & accept both camelCase and snake_case ---
    const body = req.body || {};

    const email = String(body.email || '').trim().toLowerCase();
    const password = body.password;
    const role = body.role || 'customer';

    const full_name = String(body.full_name || body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const address = body.address || null;

    const nid_number = body.nid_number || body.nid || null;
    const service_type = body.service_type || body.serviceType || null;

    // --- Validation ---
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'All required fields must be filled' 
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Phone validation
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Role validation
    if (!['customer', 'professional', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Professional specific validation
    if (role === 'professional' && (!nid_number || !service_type)) {
      return res.status(400).json({
        success: false,
        error: 'NID number and service type are required for professionals'
      });
    }

    // --- Check existing user in app database first ---
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing user:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Database error during registration'
      });
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // --- Check if user exists in Supabase Auth ---
    let authUserId = null;
    
    // Try to use admin client first (for creating users with email confirmed)
    const authClient = supabaseAdmin || supabase;
    
    // Check if user exists in Auth (only if using admin client)
    let existingAuthUser = null;
    if (supabaseAdmin) {
      try {
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && authUsers?.users) {
          existingAuthUser = authUsers.users.find(u => u.email === email);
        }
      } catch (listErr) {
        console.error('❌ Error checking auth users:', listErr);
        // Continue with registration attempt
      }
    }

    if (existingAuthUser) {
      // User exists in Auth but not in our users table - use existing auth user
      authUserId = existingAuthUser.id;
      console.log(`📝 Using existing auth user: ${authUserId}`);
    } else {
      // --- Create new auth user ---
      try {
        const { data: createdAuthUser, error: authError } = await authClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { 
            full_name, 
            role,
            phone 
          }
        });

        if (authError) {
          console.error('❌ Auth creation error:', authError);
          
          // Fallback to regular signUp if admin creation fails
          if (authError.message?.includes('not allowed') || authError.message?.includes('privileges')) {
            console.log('📝 Falling back to regular signUp');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name, role, phone }
              }
            });
            
            if (signUpError) {
              return res.status(500).json({
                success: false,
                error: signUpError.message
              });
            }
            
            authUserId = signUpData.user?.id;
          } else {
            return res.status(500).json({
              success: false,
              error: authError.message
            });
          }
        } else {
          authUserId = createdAuthUser.user?.id;
        }
      } catch (authCatchError) {
        console.error('❌ Auth exception:', authCatchError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create authentication account'
        });
      }
    }

    if (!authUserId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user authentication'
      });
    }

    // --- Insert app user ---
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        auth_user_id: authUserId,
        email,
        full_name,
        phone,
        role,
        address,
        status: role === 'professional' ? 'pending' : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id, auth_user_id, email, full_name, phone, role, status, address, created_at')
      .single();

    if (userError) {
      console.error('❌ User insert error:', userError);
      
      // Cleanup: If we created auth user but failed to insert app user, try to delete auth user
      if (!existingAuthUser && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          console.log('🧹 Cleaned up auth user after insert failure');
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError);
        }
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile'
      });
    }

    // --- Professional extras ---
    if (role === 'professional') {
      // Insert professional profile
      const { error: proError } = await supabase
        .from('professionals')
        .insert([{
          user_id: user.id,
          service_type,
          nid_number,
          is_verified: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (proError) {
        console.error('❌ Professional insert error:', proError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create professional profile'
        });
      }

      // Create wallet for professional
      const { error: walletError } = await supabase
        .from('wallets')
        .insert([{ 
          professional_id: user.id,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (walletError) {
        console.error('❌ Wallet creation error:', walletError);
        // Don't fail registration if wallet creation fails
        console.log('⚠️ Professional registered but wallet creation failed');
      }
    }

    // --- Generate JWT token for auto-login ---
    let token = null;
    try {
      const jwt = require('jsonwebtoken');
      token = jwt.sign(
        { 
          id: user.id, 
          auth_user_id: user.auth_user_id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'nibash-secret-key-2024',
        { expiresIn: '24h' }
      );
    } catch (jwtError) {
      console.error('❌ JWT generation error:', jwtError);
      // Continue without token
    }

    console.log(`✅ Registration successful: ${email} as ${role}`);

    return res.status(201).json({
      success: true,
      message: role === 'professional'
        ? 'Registration successful! Your account is pending admin approval.'
        : 'Registration successful!',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        address: user.address,
        created_at: user.created_at,
        displayName: user.full_name || user.email.split('@')[0],
        isAdmin: user.role === 'admin',
        isProfessional: user.role === 'professional',
        isCustomer: user.role === 'customer'
      },
      token, // Optional: auto-login token
      requiresVerification: role === 'professional',
      redirectTo: role === 'professional' ? '/pending-approval.html' : '/dashboard.html'
    });

  } catch (error) {
    console.error('❌ Registration system error:', error);
    return res.status(500).json({
      success: false,
      error: `Registration failed: ${error.message}`
    });
  }
};
