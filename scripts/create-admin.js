// scripts/create-admin.js
const { supabase } = require('../api/db');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  console.log('👑 Creating admin user...');
  
  const adminEmail = 'admin@nibash.org';
  const adminPassword = 'Admin@Nibash2024!'; // Change this immediately after first login!
  const adminFullName = 'System Administrator';
  
  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();
    
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists');
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12); // Strong salt for admin
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Create admin user
    const adminData = {
      email: adminEmail,
      password: hashedPassword,
      full_name: adminFullName,
      role: 'admin',
      account_type: 'admin',
      status: 'active',
      phone: '0000000000',
      address: 'System',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: adminUser, error } = await supabase
      .from('users')
      .insert([adminData])
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Admin user created successfully!');
    console.log('========================================');
    console.log('🔐 ADMIN CREDENTIALS:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('========================================');
    console.log('⚠️ SECURITY WARNING:');
    console.log('1. Change password immediately after first login');
    console.log('2. Enable two-factor authentication');
    console.log('3. Restrict admin access to trusted IPs');
    console.log('========================================');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };