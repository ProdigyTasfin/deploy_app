// api/db.js - Secure Database Helper with Admin Support
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ========== SECURITY WARNING ==========
// ⚠️ NEVER commit actual keys to git
// ⚠️ Use environment variables in production
// ⚠️ Consider using service role key for admin operations
// ======================================

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Log warnings for missing environment variables (but don't crash in development)
if (!supabaseUrl) {
  console.warn('⚠️ Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable is not set');
}

if (!supabaseAnonKey) {
  console.warn('⚠️ Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable is not set');
}

// Main client for general operations (limited by RLS policies)
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
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
  }
);

// Admin client for bypassing RLS (use with extreme caution)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  try {
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
    console.log('✅ Supabase admin client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase admin client:', error.message);
  }
} else {
  console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will be unavailable.');
}

// ========== DATABASE HELPERS ==========

/**
 * Secure user lookup with RLS protection
 */
async function findUserByEmail(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Database error in findUserByEmail:', error);
      throw error;
    }
    
    return data; // Returns null if not found
  } catch (error) {
    console.error('Database error in findUserByEmail:', error);
    throw error;
  }
}

/**
 * Secure user lookup by ID
 */
async function findUserById(id) {
  try {
    if (!id) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Database error in findUserById:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database error in findUserById:', error);
    throw error;
  }
}

/**
 * Secure user lookup by auth_user_id
 */
async function findUserByAuthId(authUserId) {
  try {
    if (!authUserId) {
      throw new Error('Auth User ID is required');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Database error in findUserByAuthId:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database error in findUserByAuthId:', error);
    throw error;
  }
}

/**
 * Secure user creation with validation
 */
async function createUser(userData) {
  try {
    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required');
    }
    
    // Ensure email is lowercase
    userData.email = userData.email.toLowerCase().trim();
    
    // Set timestamps
    const now = new Date().toISOString();
    userData.created_at = now;
    userData.updated_at = now;
    
    // Set default status if not provided
    userData.status = userData.status || 'active';
    
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
      console.error('Database error in createUser:', error);
      throw error;
    }
    
    // Don't return sensitive data
    const { password_hash, ...safeUserData } = data;
    return safeUserData;
  } catch (error) {
    console.error('Database error in createUser:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateUser(userId, updates) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Remove sensitive fields that shouldn't be updated directly
    const { id, auth_user_id, email, password_hash, created_at, ...safeUpdates } = updates;
    
    // Add updated timestamp
    safeUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Database error in updateUser:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Database error in updateUser:', error);
    throw error;
  }
}

/**
 * ADMIN ONLY: Bypass RLS for admin operations
 */
async function adminFindUserByEmail(email) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Admin database error in adminFindUserByEmail:', error);
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
    throw new Error('Admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  
  try {
    // Validate pagination parameters
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    const { data, error, count } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);
    
    if (error) {
      console.error('Admin database error in adminGetAllUsers:', error);
      throw error;
    }
    
    // Remove sensitive data from all users
    const safeUsers = (data || []).map(user => {
      const { password_hash, ...safeUser } = user;
      return safeUser;
    });
    
    return {
      users: safeUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  } catch (error) {
    console.error('Admin database error:', error);
    throw error;
  }
}

/**
 * ADMIN ONLY: Get user by ID
 */
async function adminFindUserById(id) {
  if (!supabaseAdmin) {
    throw new Error('Admin client not configured');
  }
  
  try {
    if (!id) {
      throw new Error('User ID is required');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Admin database error in adminFindUserById:', error);
      throw error;
    }
    
    // Remove sensitive data
    if (data) {
      const { password_hash, ...safeUser } = data;
      return safeUser;
    }
    
    return null;
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
    if (!userId || !passwordHash) {
      throw new Error('User ID and password hash are required');
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, updated_at')
      .maybeSingle(); // FIXED: Changed from .single() to .maybeSingle()
    
    if (error) {
      console.error('Database error in updateUserPassword:', error);
      throw error;
    }
    
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
    if (!serviceData.customer_id || !serviceData.service_type) {
      throw new Error('Customer ID and service type are required');
    }

    const now = new Date().toISOString();
    serviceData.created_at = now;
    serviceData.updated_at = now;
    serviceData.status = serviceData.status || 'pending';
    
    const { data, error } = await supabase
      .from('service_requests')
      .insert([serviceData])
      .select()
      .single();
    
    if (error) {
      console.error('Database error in createServiceRequest:', error);
      throw error;
    }
    
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
    if (!paymentData.customer_id || !paymentData.amount) {
      throw new Error('Customer ID and amount are required');
    }

    const now = new Date().toISOString();
    paymentData.created_at = now;
    paymentData.updated_at = now;
    paymentData.status = paymentData.status || 'pending';
    
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    
    if (error) {
      console.error('Database error in createPaymentRecord:', error);
      throw error;
    }
    
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
    if (!userId) {
      throw new Error('User ID is required');
    }

    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error in getUserServices:', error);
      throw error;
    }
    
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
    if (!userId) {
      throw new Error('User ID is required');
    }

    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Database error in getUserPayments:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Database error in getUserPayments:', error);
    throw error;
  }
}

/**
 * Get professionals with filtering
 */
async function getProfessionals(filters = {}, limit = 50) {
  try {
    limit = Math.min(100, Math.max(1, parseInt(limit) || 50));

    let query = supabase
      .from('professionals')
      .select(`
        *,
        users!inner (
          id,
          email,
          full_name,
          phone,
          address,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply filters
    if (filters.service_type) {
      query = query.eq('service_type', filters.service_type);
    }
    
    if (filters.is_verified !== undefined) {
      query = query.eq('is_verified', filters.is_verified);
    }
    
    if (filters.min_experience) {
      query = query.gte('experience_years', filters.min_experience);
    }
    
    if (filters.max_hourly_rate) {
      query = query.lte('hourly_rate', filters.max_hourly_rate);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Database error in getProfessionals:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Database error in getProfessionals:', error);
    throw error;
  }
}

/**
 * Verify database connection
 */
async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return {
      connected: true,
      timestamp: new Date().toISOString(),
      message: '✅ Database connection successful',
      config: {
        url: supabaseUrl ? '✓ Configured' : '✗ Missing',
        anonKey: supabaseAnonKey ? '✓ Configured' : '✗ Missing',
        serviceKey: supabaseServiceKey ? '✓ Configured' : '✗ Missing'
      }
    };
  } catch (error) {
    console.error('❌ Database connection check failed:', error);
    return {
      connected: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: '❌ Database connection failed',
      config: {
        url: supabaseUrl ? '✓ Configured' : '✗ Missing',
        anonKey: supabaseAnonKey ? '✓ Configured' : '✗ Missing',
        serviceKey: supabaseServiceKey ? '✓ Configured' : '✗ Missing'
      }
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
  findUserById,
  findUserByAuthId,
  createUser,
  updateUser,
  updateUserPassword,
  createServiceRequest,
  createPaymentRecord,
  getUserServices,
  getUserPayments,
  getProfessionals,
  checkDatabaseConnection,
  
  // Admin functions (use with caution)
  adminFindUserByEmail,
  adminFindUserById,
  adminGetAllUsers
};
