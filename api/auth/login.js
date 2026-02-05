// api/auth/login.js
const { supabase } = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { email, password, role } = req.body;
    
    console.log('Login attempt for:', email, 'Role:', role);
    
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and role are required'
      });
    }
    
    // Check hardcoded users first
    const hardcodedUsers = [
      {
        email: 'admin@nibash.com',
        password: 'admin123',
        userData: {
          id: 'ADMIN_001',
          email: 'admin@nibash.com',
          full_name: 'System Admin',
          role: 'admin',
          account_type: 'admin',
          status: 'active'
        }
      },
      {
        email: 'customer@example.com',
        password: 'customer123',
        userData: {
          id: 'CUSTOMER_001',
          email: 'customer@example.com',
          full_name: 'Demo Customer',
          role: 'customer',
          account_type: 'customer',
          status: 'active'
        }
      },
      {
        email: 'professional@example.com',
        password: 'professional123',
        userData: {
          id: 'PROFESSIONAL_001',
          email: 'professional@example.com',
          full_name: 'Demo Professional',
          role: 'professional',
          account_type: 'professional',
          status: 'approved'
        }
      },
      {
        email: 'tasfinhasansakib165@gmail.com',
        password: 'test123',
        userData: {
          id: 'USER_001',
          email: 'tasfinhasansakib165@gmail.com',
          full_name: 'Tasfin Hasan Sakib',
          role: 'customer',
          account_type: 'customer',
          status: 'active'
        }
      }
    ];
    
    const hardcodedUser = hardcodedUsers.find(u => 
      u.email === email && 
      u.password === password
    );
    
    if (hardcodedUser) {
      if (role && hardcodedUser.userData.role !== role) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials for this role'
        });
      }
      
      const token = jwt.sign(
        {
          id: hardcodedUser.userData.id,
          email: hardcodedUser.userData.email,
          role: hardcodedUser.userData.role
        },
        process.env.JWT_SECRET || 'nibash-secret-key-2024',
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        user: hardcodedUser.userData,
        token: token,
        redirectTo: getDashboardUrl(hardcodedUser.userData.role)
      });
    }
    
    // Check Supabase database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .single();
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check password
    let isValidPassword = false;
    if (user.password && user.password.length > 30) {
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      isValidPassword = password === user.password;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check account status
    if (user.status !== 'active' && user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.status}. Please contact support.`
      });
    }
    
    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'nibash-secret-key-2024',
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword,
      token: token,
      redirectTo: getDashboardUrl(user.role)
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

function getDashboardUrl(role) {
  switch(role) {
    case 'admin': return '/admin.html';
    case 'professional': return '/professional.html';
    case 'customer': 
    default: return '/customer.html';
  }
}