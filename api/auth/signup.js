const { supabase, supabaseAdmin } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password;
    const role = body.role || 'customer';
    const full_name = (body.full_name || body.fullName || '').trim();
    const phone = (body.phone || '').trim();
    const address = body.address || null;
    const nid_number = body.nid_number || body.nid || null;
    const service_type = body.service_type || body.serviceType || null;

    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }

    if (!['customer', 'professional', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    if (role === 'professional' && (!nid_number || !service_type)) {
      return res.status(400).json({ success: false, error: 'NID number and service type are required for professionals' });
    }

    const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existingUser) return res.status(409).json({ success: false, error: 'Email already registered' });

    let authUserId;
    if (supabaseAdmin) {
      const { data: createdAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });
      if (authError) return res.status(500).json({ success: false, error: authError.message });
      authUserId = createdAuthUser.user?.id;
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name, role } }
      });
      if (signUpError) return res.status(500).json({ success: false, error: signUpError.message });
      authUserId = signUpData.user?.id;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{ auth_user_id: authUserId, email, full_name, phone, role, address, status: role === 'professional' ? 'pending' : 'active' }])
      .select('id, auth_user_id, email, full_name, phone, role, status, created_at')
      .single();

    if (userError) return res.status(500).json({ success: false, error: userError.message });

    if (role === 'professional') {
      const { error: professionalError } = await supabase.from('professionals').insert([{ user_id: user.id, service_type, nid_number, is_verified: false, is_active: true }]);
      if (professionalError) return res.status(500).json({ success: false, error: professionalError.message });

      const { error: walletError } = await supabase.from('wallets').upsert([{ professional_id: user.id }], { onConflict: 'professional_id' });
      if (walletError) return res.status(500).json({ success: false, error: walletError.message });
    }

    return res.status(201).json({
      success: true,
      message: role === 'professional' ? 'Registration successful! Account pending admin approval.' : 'Registration successful!',
      user: { ...user, fullName: user.full_name }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: `Registration failed: ${error.message}` });
  }
};
