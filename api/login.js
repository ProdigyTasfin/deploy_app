// api/login.js - FIXED VERSION (KEEPING ALL EXISTING CODE)
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    const { email, password, role } = req.body;
    
    console.log('Login attempt:', { email, role });
    
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and role are required' 
      });
    }
    
    // First check hardcoded admin (your existing users)
    if (email === 'admin@nibash.com' && password === 'admin123') {
      const adminUser = {
        id: 'ADMIN_001',
        email: 'admin@nibash.com',
        fullName: 'System Admin',
        role: 'admin',
        accountType: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      return res.status(200).json({
        success: true,
        user: adminUser,
        message: 'Login successful'
      });
    }
    
    // Check other demo users
    const demoUsers = [
      {
        email: 'customer@example.com',
        password: 'customer123',
        role: 'customer',
        userId: 'CUSTOMER_001',
        fullName: 'Demo Customer'
      },
      {
        email: 'professional@example.com',
        password: 'professional123',
        role: 'professional',
        userId: 'PROFESSIONAL_001',
        fullName: 'Demo Professional'
      },
      {
        email: 'tasfinhasansakib165@gmail.com',
        password: 'test123',
        role: 'customer',
        userId: 'USER_001',
        fullName: 'Tasfin Hasan Sakib'
      }
    ];
    
    const demoUser = demoUsers.find(u => 
      u.email === email && 
      u.password === password && 
      (role === 'customer' || u.role === role)
    );
    
    if (demoUser) {
      const userResponse = {
        id: demoUser.userId,
        email: demoUser.email,
        fullName: demoUser.fullName,
        role: demoUser.role,
        accountType: demoUser.role,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      return res.status(200).json({
        success: true,
        user: userResponse,
        message: 'Login successful'
      });
    }
    
    // If no demo user found, check Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      // Fallback to local storage check
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    const user = users[0];
    
    // Check if password is hashed or plain text
    let validPassword = false;
    if (user.password && user.password.length > 30) {
      // Likely hashed, use bcrypt
      validPassword = await bcrypt.compare(password, user.password);
    } else {
      // Plain text comparison (for demo)
      validPassword = password === user.password;
    }
    
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      success: true,
      user: userWithoutPassword,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};