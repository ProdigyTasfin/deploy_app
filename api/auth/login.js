// api/login.js
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('📥 Login API called');
    
    // Get request body
    const { email, password, role = 'customer' } = req.body;
    
    console.log('📧 Login attempt for:', email, 'Role:', role);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    // Default users (for demo)
    const defaultUsers = [
      {
        id: 'ADMIN_001',
        email: 'admin@nibash.com',
        password: 'admin123',
        fullName: 'System Admin',
        role: 'admin',
        accountType: 'admin',
        status: 'active'
      },
      {
        id: 'CUSTOMER_001',
        email: 'customer@example.com',
        password: 'customer123',
        fullName: 'Demo Customer',
        role: 'customer',
        accountType: 'customer',
        status: 'active'
      },
      {
        id: 'PROFESSIONAL_001',
        email: 'professional@example.com',
        password: 'professional123',
        fullName: 'Demo Professional',
        role: 'professional',
        accountType: 'professional',
        status: 'approved'
      }
    ];
    
    // Find user
    const user = defaultUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    );
    
    if (user) {
      // Check role if specified
      if (role && user.role !== role) {
        return res.status(401).json({ 
          success: false, 
          error: `Invalid login for ${role} account` 
        });
      }
      
      // Generate token
      const token = 'jwt_' + Date.now() + '_' + Math.random().toString(36).substr(2);
      
      console.log('✅ Login successful for:', user.email);
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || '',
          address: user.address || '',
          accountType: user.accountType,
          role: user.role,
          status: user.status
        },
        token: token,
        message: 'Login successful'
      });
    } else {
      console.log('❌ No user found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
