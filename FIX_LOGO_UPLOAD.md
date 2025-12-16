# Fix Logo Upload RLS Issue

## Problem
The admin panel uses Clerk for authentication, but Supabase RLS policies check for Supabase authentication. This causes "new row violates row-level security policy" errors when uploading logos.

## Solution
Created API routes that use Supabase Service Role Key to bypass RLS:

1. `/api/settings/upload-logo` - Handles logo file uploads
2. `/api/settings/update` - Handles site settings updates

These routes:
- Check Clerk authentication first (security)
- Use service role key to bypass RLS
- Handle all Supabase operations server-side

## Setup Required

1. **Add Service Role Key to `.env.local`:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   
   You can find this in:
   - Supabase Dashboard → Settings → API
   - Look for "service_role" key (keep this secret!)

2. **Make sure the `site-assets` bucket exists:**
   - Go to Supabase Dashboard → Storage
   - Create bucket named `site-assets`
   - Set it to Public

3. **Run the SQL policies:**
   - Run `schema_site_assets_bucket.sql` in Supabase SQL Editor
   - Run `schema_site_settings_rls.sql` in Supabase SQL Editor

## How It Works

1. User uploads logo in admin panel
2. Logo is compressed client-side
3. Compressed file is sent to `/api/settings/upload-logo`
4. API route checks Clerk auth, then uses service role key to upload
5. Settings are updated via `/api/settings/update`
6. No RLS errors because service role key bypasses all policies

## Testing

1. Make sure you're logged into the admin panel
2. Go to Settings page
3. Upload a logo image
4. Should work without RLS errors!

