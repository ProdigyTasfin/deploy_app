const jwt = require('jsonwebtoken');
const { supabase } = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
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

  if (!['professional', 'admin'].includes(decoded.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const status = req.query.status || 'pending';

  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({ success: true, requests: data });
};
