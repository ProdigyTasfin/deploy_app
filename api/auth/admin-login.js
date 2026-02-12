// api/auth/admin-login.js - SIMPLE FIX
const supabase = require('../db'); // Fixed: removed destructuring
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

    console.log('🔐 Admin login attempt:', email);

    // 1. Try to find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Check if admin (multiple ways)
    const isAdmin = user.role === 'admin' || 
                   user.account_type === 'admin' ||
                   user.email.includes('admin') ||
                   user.email.endsWith('@nibash.org') ||
                   user.email.endsWith('@nibash.com');

    if (!isAdmin) {
      console.log('❌ Not an admin:', email, 'Role:', user.role);
      return res.status(403).json({ error: 'Admin access only' });
    }

    // 3. Check password (support both hashed and plain)
    const isHashed = user.password && user.password.startsWith('$2');
    let isValid = false;

    if (isHashed) {
      // Compare with bcrypt
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Plain text comparison (temporary)
      isValid = password === user.password;
      
      // Auto-upgrade to hash
      if (isValid) {
        try {
          const hashedPassword = await bcrypt.hash(password, 10);
          await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id);
          console.log('✅ Upgraded admin password to hash');
        } catch (hashError) {
          console.error('Failed to hash password:', hashError);
        }
      }
    }

    if (!isValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Create token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: 'admin',
        is_admin: true
      },
      process.env.JWT_SECRET || 'nibash-secret-2024',
      { expiresIn: '12h' }
    );

    // 5. Remove password from response
    const { password: _, ...safeUser } = user;

    console.log('✅ Admin login successful:', email);

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
    console.error('Admin login system error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
