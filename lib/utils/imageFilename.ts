/**
 * Generate a unique filename for image uploads
 * Uses timestamp + random string to ensure uniqueness and cache busting
 * When an image is updated, it gets a NEW filename, so browsers fetch the fresh version
 * 
 * Format: timestamp-randomstring.webp
 * Example: 1704067200000-a3f5b9c2d1e4f6.webp
 */
export function generateUniqueImageFilename(originalName?: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15) // 13 character random string
  const extension = originalName?.match(/\.[^.]+$/)?.[0] || '.webp'
  return `${timestamp}-${random}${extension}`
}

