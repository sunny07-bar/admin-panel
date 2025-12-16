-- ============================================================
-- Add Instagram and Facebook to Site Settings
-- ============================================================
-- This migration adds Instagram and Facebook URL fields to site_settings
-- Since site_settings uses a key-value structure, we just need to insert/update the keys

-- Insert or update Instagram setting
INSERT INTO public.site_settings (key, value, created_at, updated_at)
VALUES ('instagram_url', '"https://instagram.com/your-restaurant"'::jsonb, now(), now())
ON CONFLICT (key) 
DO UPDATE SET 
  value = '"https://instagram.com/your-restaurant"'::jsonb,
  updated_at = now();
  
-- Insert or update Facebook setting
INSERT INTO public.site_settings (key, value, created_at, updated_at)
VALUES ('facebook_url', '"https://facebook.com/your-restaurant"'::jsonb, now(), now())
ON CONFLICT (key) 
DO UPDATE SET 
  value = '"https://facebook.com/your-restaurant"'::jsonb,
  updated_at = now();

-- Note: The values are stored as JSONB strings. 
-- You can update these URLs through the admin panel after running this migration.

