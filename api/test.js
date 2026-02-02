// api/test.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test connection
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5)
    
    res.json({
      success: true,
      message: 'API is working!',
      supabaseConnected: !error,
      error: error ? error.message : null,
      users: data || [],
      env_vars: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Not set',
        supabaseKey: supabaseKey ? 'Set' : 'Not set'
      }
    })
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    })
  }
}