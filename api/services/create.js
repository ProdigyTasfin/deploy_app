const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'nibash-secret-key-2024');
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  const {
    service_id,
    service_type,
    description,
    preferred_date,
    preferred_time,
    address,
    status,
    customer_name,
    customer_phone
  } = req.body || {};

  if (!service_id || !service_type || !description || !preferred_date || !preferred_time || !address) {
    return res.status(400).json({
      success: false,
      error: 'Missing required service request fields'
    });
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert([{
      service_id,
      service_type,
      description,
      preferred_date,
      preferred_time,
      address,
      status: status || 'pending',
      customer_name: customer_name || '',
      customer_id: decoded.id,
      customer_phone: customer_phone || '',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(201).json({ success: true, request: data });
};
