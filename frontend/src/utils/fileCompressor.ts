/**
 * Client-Side Image Compression Utility
 * Resizes and compresses image files (JPEG, PNG, WebP) in the browser before upload,
 * reducing payload size by 70-90% while retaining high legibility for document verification.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  mimeType: 'image/jpeg',
};

/**
 * Format bytes into human-readable string (e.g., "1.4 MB", "450 KB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image file. If the file is a PDF or other non-image, returns the original file untouched.
 */
export async function compressImageFile(
  file: File,
  customOptions?: CompressionOptions
): Promise<File> {
  // If it's a PDF or non-image, skip compression
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let { width, height } = img;
        const maxW = options.maxWidth!;
        const maxH = options.maxHeight!;

        // Calculate aspect-ratio scaling
        if (width > maxW || height > maxH) {
          if (width / height > maxW / maxH) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        // Fill white background for transparent PNGs converted to JPEG
        if (options.mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob is missing or larger, use original
              return resolve(file);
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: options.mimeType || 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          options.mimeType || 'image/jpeg',
          options.quality || 0.82
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}
