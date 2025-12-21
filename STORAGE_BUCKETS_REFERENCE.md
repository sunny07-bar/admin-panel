# Supabase Storage Buckets Reference

This document shows which Supabase storage buckets are used for different types of images in the admin panel.

## Bucket Mapping

### 1. **Events** → `events` bucket
- **Upload Path**: `events/{fileName}.webp`
- **Database Storage**: `events/{fileName}.webp` (relative path)
- **Delete Operation**: Uses bucket `events` with cleaned path
- **Pages**: 
  - Create: `/events/new`
  - Edit: `/events/[id]`
  - List/Delete: `/events`

### 2. **Banners** → `banners` bucket
- **Upload Path**: `hero/{fileName}.webp`
- **Database Storage**: `hero/{fileName}.webp` (relative path)
- **Delete Operation**: Uses bucket `banners` with cleaned path
- **Pages**: 
  - Create: `/banners/new`
  - Edit: `/banners/[id]`
  - List/Delete: `/banners`

### 3. **Menu Items** → `menu-items` bucket
- **Upload Path**: `items/{fileName}.webp`
- **Database Storage**: `items/{fileName}.webp` (relative path)
- **Delete Operation**: Uses bucket `menu-items` with cleaned path
- **Pages**: 
  - Create: `/menu/items/new`
  - Edit: `/menu/items/[id]`
  - List/Delete: `/menu/items`

### 4. **Gallery Images** → `gallery` bucket
- **Upload Path**: `{category}/{fileName}.webp` (category: food, ambience, events, other)
- **Database Storage**: `{category}/{fileName}.webp` (relative path)
- **Delete Operation**: Uses bucket `gallery` with cleaned path
- **Pages**: 
  - Create: `/gallery/new`
  - Edit: `/gallery/[id]`
  - List/Delete: `/gallery`

### 5. **Offers** → `offers` bucket
- **Upload Path**: `offers/{fileName}.webp`
- **Database Storage**: `offers/{fileName}.webp` (relative path)
- **Delete Operation**: Uses bucket `offers` with cleaned path
- **Pages**: 
  - Create: `/offers/new`
  - Edit: `/offers/[id]`
  - List/Delete: `/offers`

### 6. **Site Assets** → `site-assets` bucket
- **Upload Path**: `logo/{fileName}.webp`
- **Database Storage**: `logo/{fileName}.webp` (relative path)
- **Delete Operation**: Handled via API route `/api/settings/upload-logo`
- **Pages**: 
  - Settings: `/settings`

## Image Path Cleaning Logic

All delete operations now use consistent path cleaning:

```typescript
// Clean the path: remove URL parts if present, otherwise use as-is
let cleanPath = imagePath;
if (imagePath.includes('/storage/v1/object/public/{bucket}/')) {
  cleanPath = imagePath.split('/storage/v1/object/public/{bucket}/')[1];
}
// Remove query parameters if any
cleanPath = cleanPath.split('?')[0];

// Delete from correct bucket
await supabase.storage.from("{bucket}").remove([cleanPath]);
```

## Verification Checklist

When deleting images, verify:
1. ✅ Correct bucket name is used (matches upload bucket)
2. ✅ Path is cleaned (removes URL prefix and query params if present)
3. ✅ Path matches the format stored in database (relative path with folder prefix)
4. ✅ Console logs show the cleaned path and bucket name for debugging

## Common Issues Fixed

1. **Path Mismatch**: Database stores relative paths like `events/file.webp`, but delete was trying to use full URLs
2. **Bucket Mismatch**: Ensured delete operations use the same bucket as upload operations
3. **Path Cleaning**: Added consistent path cleaning logic across all delete operations
4. **Edit Pages**: Fixed old image deletion when updating records with new images

## Testing

To test image deletion:
1. Upload an image in any section
2. Check browser console for upload path
3. Delete the record
4. Check browser console for deletion logs (should show cleaned path and bucket)
5. Verify image is removed from Supabase Storage dashboard

