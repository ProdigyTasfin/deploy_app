const jwt = require('jsonwebtoken');
const { supabase } = require('../db'); // Fix: Destructure the import

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check token
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authorization token required' 
    });
  }

  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'nibash-secret-key-2024');
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }

  // Check admin role
  if (decoded.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden: Admin access required' 
    });
  }

  // Fetch users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }

  // Fetch professionals data if users exist
  let professionals = [];
  if (users && users.length > 0) {
    const userIds = users.map((u) => u.id);
    const { data: proData, error: proError } = await supabase
      .from('professionals')
      .select('user_id, service_type, is_verified, is_active, experience_years, hourly_rate')
      .in('user_id', userIds);
    
    if (proError) {
      console.error('Error fetching professionals:', proError);
      // Don't return error, just log it and continue with empty professionals
    }
    
    professionals = proData || [];
  }

  return res.json({ 
    success: true, 
    users: users || [], 
    professionals 
  });
};
