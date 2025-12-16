# Create site-assets Bucket in Supabase

## Option 1: Via Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Enter bucket name: `site-assets`
5. Set **Public bucket** to **ON** (so images can be accessed without authentication)
6. Click **"Create bucket"**
7. (Optional) Create a folder named `logo` inside the bucket

## Option 2: Via Supabase Management API

If you want to create it programmatically, you can use the Supabase Management API:

```bash
curl -X POST 'https://api.supabase.com/v1/projects/{PROJECT_REF}/storage/buckets' \
  -H "Authorization: Bearer {SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "site-assets",
    "public": true,
    "file_size_limit": 52428800,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp", "image/gif"]
  }'
```

Replace:
- `{PROJECT_REF}` with your Supabase project reference ID
- `{SERVICE_ROLE_KEY}` with your Supabase service role key (found in Project Settings → API)

## Option 3: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref {PROJECT_REF}

# Create bucket (requires Supabase CLI with storage commands)
# Note: This may require additional setup
```

## Storage Policies (Optional - for additional security)

After creating the bucket, you may want to set up policies. Go to Storage → site-assets → Policies:

### Policy 1: Allow public read access
```sql
-- Allow anyone to read files from site-assets bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');
```

### Policy 2: Allow authenticated users to upload (if you want to restrict uploads)
```sql
-- Allow authenticated users to upload to site-assets bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);
```

### Policy 3: Allow authenticated users to update/delete
```sql
-- Allow authenticated users to update/delete in site-assets bucket
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);
```

## Quick Setup Script

If you have access to the Supabase Dashboard, the fastest way is:
1. Go to Storage → New bucket
2. Name: `site-assets`
3. Public: **ON**
4. Create

That's it! The bucket will be ready to use.

