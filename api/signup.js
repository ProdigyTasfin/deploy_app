// api/signup.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('📥 Signup request received');
    
    let body;
    try {
      body = JSON.parse(req.body);
    } catch {
      body = req.body;
    }
    
    const { email, password, role, fullName, phone, address } = body;
    
    console.log('📧 Signup attempt for:', email);
    
    // Validation
    if (!email || !password || !role || !fullName || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
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
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        email,
        password: hashedPassword,
        role,
        full_name: fullName,
        phone,
        address: address || '',
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + insertError.message 
      });
    }
    
    console.log('✅ User created:', newUser.id);
    
    // Return user data (without password)
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      phone: newUser.phone,
      address: newUser.address || '',
      status: newUser.status || 'active'
    };
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}
