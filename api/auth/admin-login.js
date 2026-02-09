// api/auth/admin-login.js
const { supabase } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // SECURITY: Check if email ends with admin domain (optional)
    const isAdminDomain = normalizedEmail.endsWith('@nibash.org') || 
                         normalizedEmail.includes('admin');
    
    if (!isAdminDomain) {
      console.log('Admin login attempt with non-admin email:', normalizedEmail);
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !user) {
      console.log('Admin login failed: User not found', normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.account_type !== 'admin') {
      console.log('Admin login failed: Not admin role', normalizedEmail, user.role);
      return res.status(403).json({ error: 'Admin access only' });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({ 
        error: `Account is ${user.status}. Contact support.` 
      });
    }

    // Verify password
    const isHashed = user.password.startsWith('$2');
    let isValid = false;

    if (isHashed) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Fallback for unhashed passwords (temporary)
      isValid = password === user.password;
      
      // Auto-upgrade to hash if password matches
      if (isValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await supabase
          .from('users')
          .update({ password: hashedPassword })
          .eq('id', user.id);
      }
    }

    if (!isValid) {
      console.log('Admin login failed: Invalid password', normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate admin-specific JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: 'admin',
        is_admin: true,
        permissions: ['all']
      },
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-secret-2024',
      { expiresIn: '12h' } // Shorter expiry for admin
    );

    // Remove password from response
    const { password: _, ...safeUser } = user;

    // Log successful admin login
    console.log('✅ Admin login successful:', normalizedEmail);

    res.json({
      success: true,
      user: {
        ...safeUser,
        isAdmin: true,
        permissions: ['all']
      },
      token,
      admin_access: true,
      redirectTo: '/admin.html'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};