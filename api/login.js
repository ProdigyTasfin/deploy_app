// api/login.js
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { email, password, role } = req.body;
    
    console.log('📥 Login attempt:', { email, role });
    
    if (!email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, and role are required' 
      });
    }
    
    // Query user
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
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    const user = users[0];
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }
    
    console.log('✅ Login successful:', user.id);
    
    // Return success response
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        address: user.address
      },
      message: 'Login successful'
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}