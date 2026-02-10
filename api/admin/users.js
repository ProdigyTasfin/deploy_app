const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'Authorization token required' });

  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'nibash-secret-key-2024'); }
  catch { return res.status(401).json({ success: false, error: 'Invalid or expired token' }); }

  if (decoded.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, status, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: error.message });

  const userIds = (users || []).map((u) => u.id);
  let professionals = [];
  if (userIds.length > 0) {
    const { data: proData } = await supabase
      .from('professionals')
      .select('user_id, service_type, is_verified, is_active, experience_years, hourly_rate')
      .in('user_id', userIds);
    professionals = proData || [];
  }

  return res.json({ success: true, users, professionals });
};
