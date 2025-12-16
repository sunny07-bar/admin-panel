/**
 * Compresses and converts an image to WebP format
 * Uses Canvas API to resize and convert to WebP with iterative quality reduction
 * @param file - The image file to compress
 * @param targetSizeKB - Target size in KB (default: 200)
 * @returns Compressed File object in WebP format
 */
export async function compressImageToWebP(
  file: File,
  targetSizeKB: number = 200
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

        // Try different quality levels to reach target size
        let quality = 0.85; // Start with 85% quality
        let minQuality = 0.1; // Minimum quality threshold
        let bestFile: File | null = null;

        while (quality >= minQuality) {
          const blob = await new Promise<Blob | null>((resolveBlob) => {
            canvas.toBlob(
              (blob) => resolveBlob(blob),
              'image/webp',
              quality
            );
          });

          if (!blob) {
            quality -= 0.05;
            continue;
          }

          const fileSizeKB = blob.size / 1024;
          const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          const compressedFile = new File([blob], fileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          // If we've reached the target size, return immediately
          if (fileSizeKB <= targetSizeKB) {
            console.log(`✓ Image compressed to ${fileSizeKB.toFixed(2)} KB (quality: ${(quality * 100).toFixed(0)}%)`);
            resolve(compressedFile);
            return;
          }

          // Keep track of the best (smallest) file so far
          if (!bestFile || fileSizeKB < bestFile.size / 1024) {
            bestFile = compressedFile;
          }

          // Reduce quality for next iteration
          quality -= 0.05;
        }

        // If we couldn't reach target size, return the best we have
        if (bestFile) {
          const finalSizeKB = bestFile.size / 1024;
          console.log(`⚠ Image compressed to ${finalSizeKB.toFixed(2)} KB (minimum quality reached)`);
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

