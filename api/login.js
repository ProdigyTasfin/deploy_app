// api/login.js - Supabase version
import supabase from './db.js'
import bcrypt from 'bcryptjs'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  const { email, password, role } = req.body
  
  try {
    // Query user from Supabase
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .limit(1)
    
    if (error) throw error
    
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const user = users[0]
    
    // Verify password
    const valid = await bcrypt.compare(password, user.password)
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    res.json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
      role: user.role,
      email: user.email
    })
    
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}