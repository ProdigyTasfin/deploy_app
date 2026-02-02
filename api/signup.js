// api/signup.js
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  // CORS headers - CRITICAL for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { email, password, role, fullName, phone, address } = req.body
    
    console.log('📥 Signup request:', { email, role, fullName })
    
    // Validation
    if (!email || !password || !role || !fullName || !phone) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existingUser) {
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
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
    
    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return res.status(500).json({ error: 'Database error: ' + insertError.message })
    }
    
    console.log('✅ User created:', newUser[0].id)
    
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
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