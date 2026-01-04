/**
 * Script to create the first admin user
 * 
 * Usage:
 * 1. Set environment variables:
 *    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 
 * 2. Run: node scripts/create-first-admin.js
 * 
 * Or set the values directly below:
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local file manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

// Try to load dotenv if available, otherwise load manually
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  loadEnvFile();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.argv[2];
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[3];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createFirstAdmin() {
  // Set your admin user details here
  const adminEmail = process.argv[4] || process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.argv[5] || process.env.ADMIN_PASSWORD || 'admin123456';
  const adminName = process.argv[6] || process.env.ADMIN_NAME || 'Admin User';

  console.log('🚀 Creating first admin user...');
  console.log(`📧 Email: ${adminEmail}`);
  console.log(`👤 Name: ${adminName}`);

  try {
    // Step 1: Create auth user
    console.log('\n📝 Step 1: Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      if (authError.message.includes('already registered')) {
        console.log('\n💡 User already exists. Checking if user record exists...');
        // Try to get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
        
        if (existingUser) {
          // Check if user record exists in public.users
          const { data: userRecord } = await supabase
            .from('users')
            .select('*')
            .eq('id', existingUser.id)
            .single();

          if (userRecord) {
            console.log('✅ User already exists in users table');
            console.log(`   Role: ${userRecord.role}`);
            console.log(`   Active: ${userRecord.is_active}`);
            return;
          } else {
            console.log('📝 Creating user record in public.users table...');
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: existingUser.id,
                email: adminEmail,
                full_name: adminName,
                role: 'admin',
                is_active: true,
              });

            if (insertError) {
              console.error('❌ Error creating user record:', insertError.message);
              return;
            }
            console.log('✅ Admin user created successfully!');
            return;
          }
        }
      }
      return;
    }

    if (!authData?.user) {
      console.error('❌ Failed to create auth user: No user data returned');
      return;
    }

    console.log('✅ Auth user created successfully!');
    console.log(`   User ID: ${authData.user.id}`);

    // Step 2: Create user record in public.users table
    console.log('\n📝 Step 2: Creating user record in public.users table...');
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        full_name: adminName,
        role: 'admin',
        is_active: true,
      });

    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.log('🧹 Cleaned up auth user');
      return;
    }

    console.log('✅ User record created successfully!');

    console.log('\n🎉 First admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: admin`);
    console.log('\n🔗 You can now login at: http://localhost:3000/login');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
createFirstAdmin();

