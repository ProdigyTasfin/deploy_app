const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, and role are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, auth_user_id, email, full_name, phone, role, status, address, created_at')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (userError || !user) return res.status(401).json({ success: false, error: 'Invalid account profile' });
    if (user.role !== role) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (!['active', 'approved'].includes(user.status)) {
      return res.status(403).json({ success: false, error: `Account is ${user.status}. Please contact support.`, accountStatus: user.status });
    }

    const token = jwt.sign(
      { id: user.id, auth_user_id: user.auth_user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'nibash-secret-key-2024',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      user: {
        ...user,
        displayName: user.full_name || user.email.split('@')[0],
        isAdmin: user.role === 'admin'
      },
      token,
      redirectTo: user.role === 'admin' ? '/admin.html' : user.role === 'professional' ? '/professional.html' : '/customer.html',
      expiresIn: '24h'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
