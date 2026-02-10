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

  const {
    service_request_id,
    professional_id,
    transaction_id,
    mobile_number,
    payment_type,
    amount,
    status = 'submitted',
    note
  } = req.body || {};

  if (!service_request_id || !transaction_id || !mobile_number || !payment_type || !amount) {
    return res.status(400).json({ success: false, error: 'service_request_id, transaction_id, mobile_number, payment_type, amount are required' });
  }

  if (!['bkash', 'nagad', 'bank'].includes(payment_type)) {
    return res.status(400).json({ success: false, error: 'Invalid payment_type' });
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([{
      service_request_id,
      customer_id: decoded.id,
      professional_id: professional_id || null,
      transaction_id,
      mobile_number,
      payment_type,
      amount,
      status,
      note
    }])
    .select('*')
    .single();

  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.status(201).json({ success: true, payment: data });
};
