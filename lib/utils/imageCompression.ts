/**
 * Compresses and converts an image to WebP format
 * Uses Canvas API to resize and convert to WebP with iterative quality reduction
 * Maintains high quality while ensuring file size is under target
 * @param file - The image file to compress
 * @param targetSizeKB - Target size in KB (default: 100)
 * @returns Compressed File object in WebP format
 */
export async function compressImageToWebP(
  file: File,
  targetSizeKB: number = 100
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions maintaining aspect ratio (max 1400px)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1400;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Clear canvas to ensure transparency is preserved (important for PNG logos)
        ctx.clearRect(0, 0, width, height);

        // Draw image to canvas (preserves transparency)
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to reach target size while maintaining quality
        // Start with high quality and reduce only if necessary
        let quality = 0.95; // Start with 95% quality for maximum visual quality
        let minQuality = 0.6; // Minimum quality threshold (60% to maintain good quality)
        let bestFile: File | null = null;
        let bestQuality = quality;
        let bestSize = Infinity;

        // Binary search approach for better quality/size balance
        // Use smaller steps for finer control
        while (quality >= minQuality) {
          const blob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(
              (blob) => resolveBlob(blob),
              'image/webp',
              quality
            );
          });

          if (!blob) {
            quality -= 0.02;
            continue;
          }

          const fileSizeKB = blob.size / 1024;
          const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          const compressedFile = new File([blob], fileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          // If we've reached the target size, return immediately with best quality
          if (fileSizeKB <= targetSizeKB) {
            console.log(`✓ Image compressed to ${fileSizeKB.toFixed(2)} KB (quality: ${(quality * 100).toFixed(0)}%)`);
            resolve(compressedFile);
            return;
          }

          // Keep track of the best quality file that's closest to target size
          // Prefer files that are closer to target size but still under 120% of target
          if (fileSizeKB <= targetSizeKB * 1.2) {
            if (!bestFile || (fileSizeKB < bestSize && quality > bestQuality - 0.1)) {
              bestFile = compressedFile;
              bestQuality = quality;
              bestSize = fileSizeKB;
            }
          }

          // Reduce quality for next iteration (smaller steps for finer control)
          quality -= 0.02;
        }

        // If we couldn't reach target size, try reducing dimensions incrementally
        if (bestFile && bestFile.size / 1024 > targetSizeKB) {
          let currentWidth = width;
          let currentHeight = height;
          let attempts = 0;
          const maxAttempts = 5; // Limit attempts to prevent infinite loops
          
          while (attempts < maxAttempts && bestFile.size / 1024 > targetSizeKB) {
            // Reduce dimensions by 5% each time (more gradual)
            currentWidth = Math.round(currentWidth * 0.95);
            currentHeight = Math.round(currentHeight * 0.95);
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            ctx.clearRect(0, 0, currentWidth, currentHeight);
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            
            // Try with high quality (90%)
            const finalBlob = await new Promise<Blob | null>((resolveBlob) => {
              canvas.toBlob(
                (blob) => resolveBlob(blob),
                'image/webp',
                0.90 // Use 90% quality for better quality preservation
              );
            });
            
            if (finalBlob) {
              const finalSizeKB = finalBlob.size / 1024;
              if (finalSizeKB <= targetSizeKB) {
                const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                const finalFile = new File([finalBlob], fileName, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                console.log(`✓ Image compressed to ${finalSizeKB.toFixed(2)} KB (with dimension reduction to ${currentWidth}x${currentHeight})`);
                resolve(finalFile);
                return;
              }
              
              // Update best file if this is better
              if (finalSizeKB < bestFile.size / 1024) {
                const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                bestFile = new File([finalBlob], fileName, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                });
                bestQuality = 0.90;
                bestSize = finalSizeKB;
              }
            }
            
            attempts++;
          }
        }
        
        // If we still have a best file, return it (even if slightly over target)
        if (bestFile) {
          const finalSizeKB = bestFile.size / 1024;
          if (finalSizeKB <= targetSizeKB * 1.1) {
            console.log(`✓ Image compressed to ${finalSizeKB.toFixed(2)} KB (quality: ${(bestQuality * 100).toFixed(0)}%)`);
          } else {
            console.log(`⚠ Image compressed to ${finalSizeKB.toFixed(2)} KB (quality: ${(bestQuality * 100).toFixed(0)}%) - slightly over target`);
          }
          resolve(bestFile);
        } else {
          reject(new Error('Failed to compress image'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

