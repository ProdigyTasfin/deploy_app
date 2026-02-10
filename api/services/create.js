const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'Authorization token required' });

  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'nibash-secret-key-2024'); }
  catch { return res.status(401).json({ success: false, error: 'Invalid or expired token' }); }

  const { service_type, title, description, preferred_date, preferred_time, address } = req.body || {};
  if (!service_type || !description || !preferred_date || !preferred_time || !address) {
    return res.status(400).json({ success: false, error: 'Missing required service request fields' });
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert([{
      customer_id: decoded.id,
      service_type,
      title: title || service_type,
      description,
      preferred_date,
      preferred_time,
      address,
      status: 'pending'
    }])
    .select('id, customer_id, service_type, title, description, preferred_date, preferred_time, address, status, created_at')
    .single();

  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.status(201).json({ success: true, request: data });
};
