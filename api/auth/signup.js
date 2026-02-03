// api/signup.js
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('📥 Signup API called');
    
    const { fullName, email, password, phone, role = 'customer', address } = req.body;
    
    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'All required fields must be filled' 
      });
    }
    
    // Create new user
    const newUser = {
      id: 'USER_' + Date.now(),
      email: email,
      fullName: fullName,
      phone: phone,
      address: address || '',
      role: role,
      accountType: role === 'professional' ? 'professional' : 'customer',
      status: role === 'professional' ? 'pending' : 'active',
      createdAt: new Date().toISOString()
    };
    
    // Generate token
    const token = 'jwt_signup_' + Date.now();
    
    console.log('✅ User created:', email);
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: newUser,
      token: token
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Registration failed' 
    });
  }
};
