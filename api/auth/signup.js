const { supabase, supabaseAdmin } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const {
      email,
      password,
      full_name,
      phone,
      role = 'customer',
      address,
      nid_number,
      service_type
    } = req.body || {};

    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ success: false, error: 'All required fields must be filled' });
    }

    if (!['customer', 'professional', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    if (role === 'professional' && (!nid_number || !service_type)) {
      return res.status(400).json({ success: false, error: 'NID number and service type are required for professionals' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const authClient = supabaseAdmin || supabase;
    const { data: createdAuthUser, error: authError } = await authClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });

    if (authError) {
      return res.status(500).json({ success: false, error: authError.message });
    }

    const authUserId = createdAuthUser.user?.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{ 
        auth_user_id: authUserId,
        email: normalizedEmail,
        full_name: full_name.trim(),
        phone: String(phone).trim(),
        role,
        address: address || null,
        status: role === 'professional' ? 'pending' : 'active'
      }])
      .select('id, email, full_name, phone, role, status, created_at')
      .single();

    if (userError) {
      return res.status(500).json({ success: false, error: userError.message });
    }

    if (role === 'professional') {
      const { error: proError } = await supabase.from('professionals').insert([{
        user_id: user.id,
        service_type,
        nid_number,
        is_verified: false,
        is_active: true
      }]);

      if (proError) return res.status(500).json({ success: false, error: proError.message });

      await supabase.from('wallets').upsert([{ professional_id: user.id }], { onConflict: 'professional_id' });
    }

    return res.status(201).json({
      success: true,
      message: role === 'professional' ? 'Registration successful! Account pending admin approval.' : 'Registration successful!',
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: `Registration failed: ${error.message}` });
  }
};
