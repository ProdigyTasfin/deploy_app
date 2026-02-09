// scripts/migrate-passwords.js
const { supabase } = require('../api/db');
const bcrypt = require('bcryptjs');

async function migrateAllPasswords() {
  console.log('🔐 Starting password migration...');
  
  try {
    // Get all users with unhashed passwords
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password, role, created_at');
    
    if (error) throw error;
    
    console.log(`Found ${users.length} users to check`);
    
    let updatedCount = 0;
    let alreadyHashed = 0;
    
    for (const user of users) {
      const password = user.password;
      
      // Check if already hashed
      const isHashed = password && 
        (password.startsWith('$2a$') || 
         password.startsWith('$2b$') || 
         password.startsWith('$2y$'));
      
      if (isHashed) {
        alreadyHashed++;
        continue;
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`Failed to update user ${user.email}:`, updateError);
      } else {
        console.log(`✅ Updated password for: ${user.email}`);
        updatedCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`Total users: ${users.length}`);
    console.log(`Already hashed: ${alreadyHashed}`);
    console.log(`Newly hashed: ${updatedCount}`);
    console.log('✅ Password migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  migrateAllPasswords();
}

module.exports = { migrateAllPasswords };