/**
 * Storage and Image Compression Utilities
 * Resiliently handles localStorage quota limits (QuotaExceededError)
 * and auto-compresses base64 images (app_logo, app_background, product photos)
 */

/**
 * Compresses an image data URI (or loads from URL) down to target dimensions and quality.
 * Typically reduces a 2MB - 5MB base64 image down to 15KB - 40KB.
 */
export async function compressBase64Image(
  dataUri: string,
  maxDimension = 320,
  quality = 0.72
): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUri;
  }

  if (!dataUri || typeof dataUri !== 'string') {
    return dataUri;
  }

  // If not a data URI (e.g. a simple URL like '/logo.png') or already tiny (< 25KB), return as is
  if (!dataUri.startsWith('data:image/') || dataUri.length < 25000) {
    return dataUri;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      // Safe timeout in case image never loads
      const timeout = setTimeout(() => {
        resolve(dataUri);
      }, 3500);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          let { width, height } = img;
          if (!width || !height) {
            resolve(dataUri);
            return;
          }

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            resolve(dataUri);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Test if webp is supported (offers smaller footprint and alpha support)
          let compressed: string | null = null;
          try {
            compressed = canvas.toDataURL('image/webp', quality);
            if (!compressed.startsWith('data:image/webp')) {
              compressed = null;
            }
          } catch {
            compressed = null;
          }

          // Fallback to jpeg or png
          if (!compressed) {
            const isPng = dataUri.startsWith('data:image/png');
            compressed = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
          }

          // Only return compressed if it actually reduced size or succeeded
          if (compressed && compressed.length > 0 && compressed.length < dataUri.length) {
            resolve(compressed);
          } else {
            resolve(dataUri);
          }
        } catch (canvasErr) {
          console.warn('[compressBase64Image] Canvas compression error:', canvasErr);
          resolve(dataUri);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(dataUri);
      };

      img.src = dataUri;
    } catch {
      resolve(dataUri);
    }
  });
}

/**
 * Safely sets an item in localStorage, catching QuotaExceededError.
 * Returns true if saved, false if failed due to storage limits.
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError = 
      err?.name === 'QuotaExceededError' || 
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 || 
      err?.code === 1014;

    console.warn(`[StorageQuota] Failed to set '${key}' (quota exceeded: ${isQuotaError}):`, err?.message || err);
    return false;
  }
}

/**
 * Safely saves store settings (specifically compressing heavy images like app_logo and app_background).
 * Returns true if successful or gracefully handled.
 */
export async function safeSaveStoreSetting(key: string, value: any): Promise<boolean> {
  if (value === undefined || value === null) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  let strVal = String(value);

  // If image data URI, compress before setting to localStorage
  if ((key === 'app_logo' || key === 'app_background') && strVal.startsWith('data:image/')) {
    const maxDim = key === 'app_logo' ? 300 : 800;
    try {
      strVal = await compressBase64Image(strVal, maxDim, 0.72);
    } catch (e) {
      console.warn(`[safeSaveStoreSetting] Compression failed for ${key}, trying original:`, e);
    }
  }

  const saved = safeSetLocalStorage(key, strVal);
  if (!saved && (key === 'app_logo' || key === 'app_background') && strVal.startsWith('data:image/')) {
    // Attempt aggressive compression if initial attempt exceeded quota
    try {
      const miniCompressed = await compressBase64Image(strVal, 160, 0.5);
      const retrySaved = safeSetLocalStorage(key, miniCompressed);
      if (retrySaved) return true;
    } catch {
      // Ignored
    }
    console.warn(`[safeSaveStoreSetting] Could not save '${key}' to localStorage due to browser quota limits.`);
    return false;
  }

  return saved;
}
