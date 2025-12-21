# Supabase Storage Buckets Summary

## Complete Bucket Structure

Based on the complete codebase analysis, here are all the Supabase storage buckets used:

### 1. **events** Bucket
- **Purpose**: Store event images
- **Path Structure**: `events/{fileName}.webp`
- **Used In**:
  - Admin Panel: `/events/new`, `/events/[id]`, `/events` (list/delete)
  - Website: Event listings, event detail pages
- **File Size Limit**: 10MB
- **Public**: Yes

### 2. **banners** Bucket
- **Purpose**: Store banner/hero images for homepage
- **Path Structure**: `hero/{fileName}.webp`
- **Used In**:
  - Admin Panel: `/banners/new`, `/banners/[id]`, `/banners` (list/delete)
  - Website: Homepage banner carousel
- **File Size Limit**: 10MB
- **Public**: Yes

### 3. **menu-items** Bucket
- **Purpose**: Store menu item images
- **Path Structure**: `items/{fileName}.webp`
- **Used In**:
  - Admin Panel: `/menu/items/new`, `/menu/items/[id]`, `/menu/items` (list/delete)
  - Website: Menu pages, menu item detail pages
- **File Size Limit**: 10MB
- **Public**: Yes

### 4. **gallery** Bucket
- **Purpose**: Store gallery images (food, ambience, events, other)
- **Path Structure**: `{category}/{fileName}.webp`
  - Categories: `food`, `ambience`, `events`, `other`
- **Used In**:
  - Admin Panel: `/gallery/new`, `/gallery/[id]`, `/gallery` (list/delete)
  - Website: Gallery page
- **File Size Limit**: 10MB
- **Public**: Yes

### 5. **offers** Bucket
- **Purpose**: Store offer/promotion images
- **Path Structure**: `offers/{fileName}.webp`
- **Used In**:
  - Admin Panel: `/offers/new`, `/offers/[id]`, `/offers` (list/delete)
  - Website: Offers page
- **File Size Limit**: 10MB
- **Public**: Yes

### 6. **site-assets** Bucket
- **Purpose**: Store site-wide assets like logos
- **Path Structure**: `logo/{fileName}.webp`
- **Used In**:
  - Admin Panel: `/settings` (logo upload via API route)
  - Website: Header, footer, various pages
- **File Size Limit**: 5MB
- **Public**: Yes
- **Special Note**: Uses API route with service role key for uploads

## Bucket Configuration Summary

| Bucket Name | Public | Max Size | MIME Types | Path Prefix |
|------------|--------|----------|------------|-------------|
| events | ✅ | 10MB | JPEG, PNG, WebP, GIF | `events/` |
| banners | ✅ | 10MB | JPEG, PNG, WebP, GIF | `hero/` |
| menu-items | ✅ | 10MB | JPEG, PNG, WebP, GIF | `items/` |
| gallery | ✅ | 10MB | JPEG, PNG, WebP, GIF | `{category}/` |
| offers | ✅ | 10MB | JPEG, PNG, WebP, GIF | `offers/` |
| site-assets | ✅ | 5MB | JPEG, PNG, WebP, GIF, SVG | `logo/` |

## Image Compression

All images uploaded through the admin panel are:
- Converted to WebP format
- Compressed to under 100KB while maintaining quality
- Stored with the path structure shown above

## Access Patterns

### Public Read Access
- All buckets allow public read access (no authentication required)
- Images are accessible via: `https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]`

### Authenticated Write Access
- Upload, update, and delete operations require Supabase authentication
- Admin panel uses service role key for operations (bypasses RLS)
- Policies are set up to allow authenticated users to manage files

## SQL Scripts

1. **`supabase_storage_buckets_delete_and_recreate.sql`**
   - Deletes all existing buckets and their objects
   - Recreates all buckets with proper configuration
   - Sets up all necessary storage policies

## Important Notes

⚠️ **WARNING**: Running the delete script will permanently delete ALL files in these buckets!

Before running the delete script:
1. Backup any important images
2. Export database records that reference image paths
3. Verify you have backups of all uploaded content

After running the recreate script:
1. Verify all buckets were created successfully
2. Test image uploads from admin panel
3. Verify images are accessible on the website
4. Check that delete operations work correctly

