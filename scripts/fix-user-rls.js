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

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testLogin() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123456';
  
  console.log(`🔐 Testing login for: ${email}\n`);

  try {
    // Test authentication
    console.log('1️⃣ Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth');
      return;
    }

    console.log('✅ Authentication successful');
    console.log(`   User ID: ${authData.user.id}`);

    // Now test querying users table with a client that has the user's session
    console.log('\n2️⃣ Testing users table query...');
    
    // Create a new client with the user's session
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    });

    const { data: userData, error: userError } = await userClient
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', authData.user.id)
      .eq('is_active', true)
      .single();

    if (userError) {
      console.error('❌ Error querying users table:', userError.message);
      console.error('   Code:', userError.code);
      console.error('   Details:', userError.details);
      console.error('   Hint:', userError.hint);
      console.log('\n💡 This suggests an RLS policy issue.');
      console.log('   Run fix-rls-policies.sql in Supabase SQL Editor');
      return;
    }

    if (!userData) {
      console.error('❌ User not found in users table');
      return;
    }

    console.log('✅ Users table query successful');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Active: ${userData.is_active}`);

    console.log('\n🎉 Login test successful! The issue might be in the frontend code.');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

testLogin();

