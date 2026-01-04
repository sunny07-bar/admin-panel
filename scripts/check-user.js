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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUser() {
  const email = process.argv[2] || 'admin@example.com';
  
  console.log(`🔍 Checking user: ${email}\n`);

  try {
    // Check auth.users
    console.log('1️⃣ Checking auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError.message);
      return;
    }

    const authUser = authUsers?.users?.find(u => u.email === email);
    
    if (!authUser) {
      console.log('❌ User not found in auth.users');
      console.log('Available users:', authUsers?.users?.map(u => u.email).join(', ') || 'None');
      return;
    }

    console.log('✅ User found in auth.users');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);

    // Check public.users
    console.log('\n2️⃣ Checking public.users...');
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (publicError) {
      if (publicError.code === 'PGRST116') {
        console.log('❌ User not found in public.users table');
        console.log('💡 The SQL schema might not have been run, or the user record was not created.');
        console.log('\n🔧 Fix: Run this SQL in Supabase SQL Editor:');
        console.log(`\nINSERT INTO public.users (id, email, full_name, role, is_active)`);
        console.log(`VALUES ('${authUser.id}', '${email}', 'Admin User', 'admin', true);`);
      } else {
        console.error('❌ Error checking public.users:', publicError.message);
        console.error('   Code:', publicError.code);
        console.error('   Details:', publicError.details);
      }
      return;
    }

    if (!publicUser) {
      console.log('❌ User record not found in public.users');
      return;
    }

    console.log('✅ User found in public.users');
    console.log(`   ID: ${publicUser.id}`);
    console.log(`   Email: ${publicUser.email}`);
    console.log(`   Name: ${publicUser.full_name || 'N/A'}`);
    console.log(`   Role: ${publicUser.role}`);
    console.log(`   Active: ${publicUser.is_active ? '✅ Yes' : '❌ No'}`);

    if (!publicUser.is_active) {
      console.log('\n⚠️  User is inactive!');
      console.log('🔧 Fix: Run this SQL to activate the user:');
      console.log(`\nUPDATE public.users SET is_active = true WHERE id = '${authUser.id}';`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkUser();

