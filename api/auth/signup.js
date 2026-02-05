// api/auth/signup.js - ENHANCED VERSION
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabase = createClient(
  'https://kohswrhxjvfygzrldyyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII'
);

module.exports = async function handler(req, res) {
  // CORS headers
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
    
    console.log('📥 Signup attempt for:', email, 'Role:', role);
    
    // ================= VALIDATION =================
    const errors = [];
    
    // Email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email is required');
    }
    
    // Password validation
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    // Name validation
    if (!full_name || full_name.trim().length < 2) {
      errors.push('Full name is required');
    }
    
    // Phone validation (Bangladesh format)
    if (phone && !/^(?:\+88|01)?\d{11}$/.test(phone.replace(/\s/g, ''))) {
      errors.push('Valid Bangladeshi phone number is required');
    }
    
    // Professional-specific validation
    if (role === 'professional') {
      if (!nid_number || nid_number.length < 10) {
        errors.push('NID number is required for professionals');
      }
      if (!service_type) {
        errors.push('Service type is required for professionals');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: errors
      });
    }
    
    // ================= CHECK IF USER EXISTS =================
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // ================= CREATE USER =================
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      full_name: full_name.trim(),
      phone: phone ? phone.replace(/\s/g, '') : null,
      role: role,
      address: address || null,
      status: role === 'professional' ? 'pending' : 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (userError) {
      console.error('Supabase error:', userError);
      return res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }
    
    // ================= CREATE PROFILE BASED ON ROLE =================
    if (role === 'professional') {
      // Create professional verification
      await supabase
        .from('professional_verifications')
        .insert([{
          user_id: newUser.id,
          nid_number: nid_number,
          service_type: service_type,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
      
      // Create professional profile
      await supabase
        .from('professional_profiles')
        .insert([{
          user_id: newUser.id,
          service_radius_km: 10,
          hourly_rate: 0,
          total_earnings: 0,
          completed_jobs: 0,
          rating: 0
        }]);
        
    } else if (role === 'customer') {
      // Create customer profile
      await supabase
        .from('customer_profiles')
        .insert([{
          user_id: newUser.id,
          address: address,
          total_spent: 0,
          loyalty_points: 0
        }]);
    }
    
    // ================= PREPARE RESPONSE =================
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status,
      created_at: newUser.created_at
    };
    
    return res.status(201).json({
      success: true,
      message: role === 'professional' 
        ? 'Registration successful! Your account is pending admin approval.' 
        : 'Registration successful!',
      user: userResponse,
      next_steps: role === 'professional' 
        ? ['Wait for admin approval', 'Complete your profile'] 
        : ['Verify your email', 'Complete your profile']
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
};