// api/db.js - SINGLE DATABASE CONNECTION FILE
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://kohswrhxjvfygzrldyyk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
}

// Database helper functions
const db = {
  // User operations
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async findUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  
  async findUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateUser(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Service request operations
  async createServiceRequest(requestData) {
    const { data, error } = await supabase
      .from('service_requests')
      .insert([requestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getServiceRequests(userId, role) {
    let query = supabase
      .from('service_requests')
      .select('*');
    
    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (role === 'professional') {
      query = query.eq('assigned_to', userId);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Payment operations
  async createPayment(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async getPayments(userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Admin operations
  async getAllUsers(role = null) {
    let query = supabase
      .from('users')
      .select('*');
    
    if (role) {
      query = query.eq('role', role);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async getPendingProfessionals() {
    const { data, error } = await supabase
      .from('professional_verifications')
      .select(`
        *,
        user:users(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async updateProfessionalStatus(userId, status) {
    const { error } = await supabase
      .from('professional_verifications')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Update user status as well
    await supabase
      .from('users')
      .update({ 
        status: status === 'approved' ? 'active' : 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    return true;
  }
};

// Export
module.exports = {
  supabase,
  db,
  testConnection
};