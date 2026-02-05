// api/auth/signup.js
const { supabase } = require('../db');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { 
      email, 
      password, 
      full_name, 
      phone, 
      role = 'customer',
      address,
      nid_number,
      service_type
    } = req.body;
    
    console.log('Signup attempt for:', email, 'Role:', role);
    
    // Validation
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be filled'
      });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }
    
    // Professional validation
    if (role === 'professional') {
      if (!nid_number || !service_type) {
        return res.status(400).json({
          success: false,
          error: 'NID number and service type are required for professionals'
        });
      }
    }
    
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      full_name: full_name.trim(),
      phone: phone.replace(/\s/g, ''),
      role: role,
      address: address || null,
      status: role === 'professional' ? 'pending' : 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (userError) {
      console.error('Supabase error:', userError);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + userError.message
      });
    }
    
    // Create profile based on role
    if (role === 'professional') {
      await supabase
        .from('professional_verifications')
        .insert([{
          user_id: user.id,
          nid_number: nid_number,
          service_type: service_type,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
    }
    
    // Prepare response
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      created_at: user.created_at
    };
    
    res.status(201).json({
      success: true,
      message: role === 'professional' 
        ? 'Registration successful! Account pending admin approval.' 
        : 'Registration successful!',
      user: userResponse
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed: ' + error.message
    });
  }
};