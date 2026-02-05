const { supabase } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
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
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and role are required'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('role', role)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isHashedPassword = typeof user.password === 'string' && user.password.startsWith('$2');
    const isValidPassword = isHashedPassword
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    if (!['active', 'approved'].includes(user.status)) {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact support.`
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'nibash-secret-key-2024',
      { expiresIn: '24h' }
    );

    const { password: _ignored, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      user: userWithoutPassword,
      token,
      redirectTo: getDashboardUrl(user.role)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

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
