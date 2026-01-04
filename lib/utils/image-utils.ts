/**
 * Get the full URL for an image stored in Supabase Storage
 * Uses Next.js API proxy route to ensure proper cache headers
 * 
 * @param imagePath - The image path (e.g., "banners/hero.webp" or "events/image.webp")
 * @param bucket - Optional bucket name. If not provided, will try to extract from path
 * @param useProxy - Whether to use the proxy route (default: true) for proper cache headers
 * @returns Full URL to the image (via proxy or direct Supabase URL)
 */
export function getImageUrl(
  imagePath: string | null | undefined,
  bucket?: string,
  useProxy: boolean = true
): string | null {
  if (!imagePath || typeof imagePath !== 'string') {
    return null
  }

  // If it's already a full URL, return it (don't proxy external URLs)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not set')
    return null
  }

  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
  
  // Determine bucket and path
  let finalBucket = bucket
  let finalPath = cleanPath
  
  if (finalBucket) {
    // If bucket is provided, use the path as-is (it should not include bucket name)
    finalPath = cleanPath
  } else {
    // Try to extract bucket from path (e.g., "banners/image.jpg" or "events/image.webp")
    // Common bucket names: banners, menu-items, events, gallery, offers, hero, site-assets, home-features
    const pathParts = cleanPath.split('/').filter(part => part.length > 0)
    const possibleBuckets = ['banners', 'menu-items', 'events', 'gallery', 'offers', 'hero', 'site-assets', 'home-features']
    
    if (pathParts.length > 1 && possibleBuckets.includes(pathParts[0])) {
      // First part is a known bucket name
      finalBucket = pathParts[0]
      finalPath = pathParts.slice(1).join('/')
    } else if (pathParts.length > 1) {
      // First part might be a bucket, use it anyway
      finalBucket = pathParts[0]
      finalPath = pathParts.slice(1).join('/')
    } else {
      // Single path segment - can't determine bucket, return null
      console.warn(`Cannot determine bucket for image path: ${imagePath}. Please specify bucket parameter.`)
      return null
    }
  }
  
  // Ensure we have both bucket and path
  if (!finalBucket || !finalPath) {
    console.warn(`Invalid image path or bucket: path=${imagePath}, bucket=${bucket}`)
    return null
  }
  
  // Use Next.js API proxy route to ensure proper cache headers
  // This ensures images are cached for 1 year with proper Cache-Control headers
  if (useProxy) {
    // Use proxy route for proper cache headers (works for both server and client)
    // Relative URLs work fine with Next.js Image component and regular img tags
    return `/api/images/${finalBucket}/${finalPath}`
  } else {
    // Fallback: direct Supabase Storage URL (if proxy is disabled)
    // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    return `${supabaseUrl}/storage/v1/object/public/${finalBucket}/${finalPath}`
  }
}

