// api/signup.js - Supabase version
import supabase from './db.js'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { email, password, role, fullName, phone, address } = req.body
  
  // Validation
  if (!email || !password || !role || !fullName || !phone) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  
  try {
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
    
    if (checkError) throw checkError
    
    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    
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
        status: role === 'professional' ? 'pending' : 'active',
        created_at: new Date().toISOString()
      }])
      .select()
    
    if (insertError) throw insertError
    
    res.status(201).json({
      success: true,
      message: role === 'professional' 
        ? 'Registration successful! Account pending approval.' 
        : 'Registration successful!',
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        role: newUser[0].role,
        fullName: newUser[0].full_name
      }
    })
    
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}