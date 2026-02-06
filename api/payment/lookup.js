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

  const paymentId = req.query.payment_id;
  if (!paymentId) {
    return res.status(400).json({ success: false, error: 'payment_id is required' });
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .or(`id.eq.${paymentId},payment_id.eq.${paymentId}`)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }

  if (decoded.role !== 'admin' && data.customer_id && data.customer_id !== decoded.id) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  return res.json({ success: true, payment: data });
};
