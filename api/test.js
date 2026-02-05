// api/test.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://kohswrhxjvfygzrldyyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII'
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Test database connection
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    // Test service requests
    const { data: services, error: servicesError } = await supabase
      .from('service_requests')
      .select('count')
      .limit(1);
    
    res.json({
      success: true,
      message: 'Nibash API Test',
      timestamp: new Date().toISOString(),
      database: {
        connected: !usersError,
        error: usersError?.message,
        tables: {
          users: users ? 'Available' : 'Missing',
          service_requests: services ? 'Available' : 'Missing'
        }
      },
      environment: {
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      },
      endpoints: {
        login: '/api/auth/login',
        signup: '/api/auth/signup',
        payment: '/api/payment/initiate',
        health: '/api/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};