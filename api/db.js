// api/db.js - Secure Database Helper with Admin Support
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Load environment variables

// ========== SECURITY WARNING ==========
// ⚠️ NEVER commit actual keys to git
// ⚠️ Use environment variables in production
// ⚠️ Consider using service role key for admin operations
// ======================================

// Use environment variables with fallbacks (development only)
const supabaseUrl = process.env.SUPABASE_URL || 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

// Service role key for admin operations (NEVER expose to client)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

// Main client for general operations (limited by RLS policies)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'x-application-name': 'nibash-api'
    }
  }
});

// Admin client for bypassing RLS (use with caution)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-application-name': 'nibash-admin',
        'x-service-role': 'true'
      }
    }
  });
}

// ========== DATABASE HELPERS ==========

/**
 * Secure user lookup with RLS protection
 */
async function findUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // User not found
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database error in findUserByEmail:', error);
    throw error;
  }
}

/**
 * Secure user creation with validation
 */
async function createUser(userData) {
  try {
    // Validate required fields
    if (!userData.email || !userData.password_hash) {
      throw new Error('Email and password hash are required');
    }
    
    // Ensure email is lowercase
    userData.email = userData.email.toLowerCase().trim();
    
    // Set timestamps
    const now = new Date().toISOString();
    userData.created_at = now;
    userData.updated_at = now;
    
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
    
    // Don't return password hash
    const { password_hash, ...safeUserData } = data;
    return safeUserData;
  } catch (error) {
    console.error('Database error in createUser:', error);
    throw error;
  }
}

/**
 * ADMIN ONLY: Bypass RLS for admin operations
 */
async function adminFindUserByEmail(email) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not configured');
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Admin database error:', error);
    throw error;
  }
}

/**
 * ADMIN ONLY: Get all users (paginated)
 */
async function adminGetAllUsers(page = 1, limit = 50) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not configured');
  }
  
  try {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);
    
    if (error) throw error;
    
    return {
      users: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Admin database error:', error);
    throw error;
  }
}

/**
 * Secure password update
 */
async function updateUserPassword(userId, passwordHash) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, updated_at')
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error in updateUserPassword:', error);
    throw error;
  }
}

/**
 * Store service request
 */
async function createServiceRequest(serviceData) {
  try {
    const now = new Date().toISOString();
    serviceData.created_at = now;
    serviceData.updated_at = now;
    serviceData.status = serviceData.status || 'pending';
    
    const { data, error } = await supabase
      .from('service_requests')
      .insert([serviceData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error in createServiceRequest:', error);
    throw error;
  }
}

/**
 * Store payment record
 */
async function createPaymentRecord(paymentData) {
  try {
    const now = new Date().toISOString();
    paymentData.created_at = now;
    paymentData.updated_at = now;
    paymentData.status = paymentData.status || 'pending';
    
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error in createPaymentRecord:', error);
    throw error;
  }
}

/**
 * Get user's services
 */
async function getUserServices(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error in getUserServices:', error);
    throw error;
  }
}

/**
 * Get user's payments
 */
async function getUserPayments(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error in getUserPayments:', error);
    throw error;
  }
}

/**
 * Verify database connection
 */
async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return {
      connected: true,
      timestamp: new Date().toISOString(),
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      connected: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

// ========== EXPORTS ==========
module.exports = {
  // Main Supabase client
  supabase,
  
  // Admin client (if configured)
  supabaseAdmin,
  
  // Helper functions
  findUserByEmail,
  createUser,
  updateUserPassword,
  createServiceRequest,
  createPaymentRecord,
  getUserServices,
  getUserPayments,
  checkDatabaseConnection,
  
  // Admin functions (use with caution)
  adminFindUserByEmail,
  adminGetAllUsers
};