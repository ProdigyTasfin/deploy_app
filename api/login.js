// api/login.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers - MUST BE BEFORE ANY RESPONSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    console.log('🔧 Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
  
  try {
    console.log('📥 Login request received');
    
    // Parse request body
    let body;
    try {
      body = JSON.parse(req.body);
    } catch {
      body = req.body;
    }
    
    const { email, password, role } = body;
    
    console.log('📧 Login attempt for:', email);
    
    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and role are required' 
      });
    }
    
    // Query user from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + error.message 
      });
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No user found with email:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    const user = users[0];
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    console.log('✅ Login successful for user:', user.id);
    
    // Return user data (without password)
    const userResponse = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      address: user.address || '',
      status: user.status || 'active'
    };
    
    return res.status(200).json({
      success: true,
      user: userResponse,
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}
