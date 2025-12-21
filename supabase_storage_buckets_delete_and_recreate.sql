-- ============================================================================
-- SUPABASE STORAGE BUCKETS - DELETE AND RECREATE
-- ============================================================================
-- This script deletes all existing storage buckets and recreates them
-- according to the website and admin-panel requirements.
--
-- IMPORTANT: This will DELETE ALL FILES in these buckets!
-- Make sure to backup any important data before running this script.
-- ============================================================================

-- ============================================================================
-- STEP 1: DELETE ALL EXISTING BUCKETS
-- ============================================================================
-- Note: You must delete all objects in buckets first, then delete the buckets
-- Supabase doesn't allow deleting buckets with objects

-- Delete all objects from each bucket (if they exist)
DELETE FROM storage.objects WHERE bucket_id = 'events';
DELETE FROM storage.objects WHERE bucket_id = 'banners';
DELETE FROM storage.objects WHERE bucket_id = 'menu-items';
DELETE FROM storage.objects WHERE bucket_id = 'gallery';
DELETE FROM storage.objects WHERE bucket_id = 'offers';
DELETE FROM storage.objects WHERE bucket_id = 'site-assets';

-- Delete the buckets themselves
DELETE FROM storage.buckets WHERE id = 'events';
DELETE FROM storage.buckets WHERE id = 'banners';
DELETE FROM storage.buckets WHERE id = 'menu-items';
DELETE FROM storage.buckets WHERE id = 'gallery';
DELETE FROM storage.buckets WHERE id = 'offers';
DELETE FROM storage.buckets WHERE id = 'site-assets';

-- ============================================================================
-- STEP 2: CREATE ALL BUCKETS
-- ============================================================================

-- 1. Events Bucket
-- Purpose: Store event images
-- Path structure: events/{fileName}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events',
  'events',
  true,  -- Public bucket (images accessible without auth)
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 2. Banners Bucket
-- Purpose: Store banner/hero images for homepage
-- Path structure: hero/{fileName}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,  -- Public bucket
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 3. Menu Items Bucket
-- Purpose: Store menu item images
-- Path structure: items/{fileName}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-items',
  'menu-items',
  true,  -- Public bucket
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 4. Gallery Bucket
-- Purpose: Store gallery images (food, ambience, events, other)
-- Path structure: {category}/{fileName}.webp (category: food, ambience, events, other)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,  -- Public bucket
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 5. Offers Bucket
-- Purpose: Store offer/promotion images
-- Path structure: offers/{fileName}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offers',
  'offers',
  true,  -- Public bucket
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 6. Site Assets Bucket
-- Purpose: Store site-wide assets like logos
-- Path structure: logo/{fileName}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,  -- Public bucket
  5242880,  -- 5MB max file size (logos are typically smaller)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
);

-- ============================================================================
-- STEP 3: DROP EXISTING POLICIES (IF ANY)
-- ============================================================================
-- Drop all existing policies for these buckets to avoid conflicts

DROP POLICY IF EXISTS "Public read access for events" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for menu-items" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for gallery" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for offers" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to events" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update events" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from events" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from banners" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to menu-items" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu-items" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from menu-items" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to gallery" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update gallery" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from gallery" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to offers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update offers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from offers" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from site-assets" ON storage.objects;

-- ============================================================================
-- STEP 4: CREATE STORAGE POLICIES FOR PUBLIC READ ACCESS
-- ============================================================================
-- These policies allow anyone to read/view images from public buckets

-- Events bucket - Public read access
CREATE POLICY "Public read access for events"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- Banners bucket - Public read access
CREATE POLICY "Public read access for banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Menu items bucket - Public read access
CREATE POLICY "Public read access for menu-items"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-items');

-- Gallery bucket - Public read access
CREATE POLICY "Public read access for gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

-- Offers bucket - Public read access
CREATE POLICY "Public read access for offers"
ON storage.objects FOR SELECT
USING (bucket_id = 'offers');

-- Site assets bucket - Public read access
CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- ============================================================================
-- STEP 5: CREATE STORAGE POLICIES FOR AUTHENTICATED UPLOAD/UPDATE/DELETE
-- ============================================================================
-- These policies allow authenticated users (admin panel) to upload, update, and delete

-- Events bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to events"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

-- Events bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update events"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

-- Events bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from events"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'events' 
  AND auth.role() = 'authenticated'
);

-- Banners bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Banners bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Banners bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners' 
  AND auth.role() = 'authenticated'
);

-- Menu items bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to menu-items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-items' 
  AND auth.role() = 'authenticated'
);

-- Menu items bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update menu-items"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'menu-items' 
  AND auth.role() = 'authenticated'
);

-- Menu items bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from menu-items"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'menu-items' 
  AND auth.role() = 'authenticated'
);

-- Gallery bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to gallery"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' 
  AND auth.role() = 'authenticated'
);

-- Gallery bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update gallery"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' 
  AND auth.role() = 'authenticated'
);

-- Gallery bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from gallery"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' 
  AND auth.role() = 'authenticated'
);

-- Offers bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to offers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

-- Offers bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update offers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

-- Offers bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from offers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offers' 
  AND auth.role() = 'authenticated'
);

-- Site assets bucket - Authenticated users can insert
CREATE POLICY "Authenticated users can upload to site-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);

-- Site assets bucket - Authenticated users can update
CREATE POLICY "Authenticated users can update site-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);

-- Site assets bucket - Authenticated users can delete
CREATE POLICY "Authenticated users can delete from site-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'site-assets' 
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after executing the script to verify everything was created correctly

-- Check all buckets were created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
ORDER BY id;

-- Check all policies were created
SELECT policyname, tablename, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All buckets are set to PUBLIC = true, meaning images can be accessed
--    without authentication via public URLs
--
-- 2. File size limits:
--    - events, banners, menu-items, gallery, offers: 10MB (10485760 bytes)
--    - site-assets: 5MB (5242880 bytes)
--
-- 3. Allowed MIME types:
--    - Standard image formats: JPEG, PNG, WebP, GIF
--    - site-assets also allows SVG
--
-- 4. Path structures:
--    - events: events/{fileName}.webp
--    - banners: hero/{fileName}.webp
--    - menu-items: items/{fileName}.webp
--    - gallery: {category}/{fileName}.webp (category: food, ambience, events, other)
--    - offers: offers/{fileName}.webp
--    - site-assets: logo/{fileName}.webp
--
-- 5. If you're using Clerk for authentication (admin panel), you may need to
--    use service role key for uploads, as the policies check for Supabase auth.
--    The admin panel API routes already handle this.
--
-- ============================================================================

