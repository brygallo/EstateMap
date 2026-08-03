/**
 * Client-side downscale before upload.
 *
 * The backend already produces the canonical WebP, but it used to receive
 * camera originals — up to 10 MB each, 50 MB per request. On a phone over
 * mobile data that transfer is what the user actually waits for, so the cheapest
 * win is to not send those bytes at all.
 *
 * Drawing through a canvas also drops EXIF, which strips GPS coordinates from
 * holiday-snap uploads as a side effect.
 */

export const MAX_EDGE = 1920;
export const QUALITY = 0.9;

/** Below this, re-encoding costs more CPU than the bytes it would save. */
const SKIP_BELOW_BYTES = 512 * 1024;

/** Keep the original unless the re-encode is meaningfully smaller. */
const MIN_SAVINGS_RATIO = 0.12;

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressed: boolean;
};

/**
 * Returns a downscaled WebP, or the original file when compressing it would not
 * pay off. Never throws: a failure here must not block the upload.
 *
 * The caller usually already decoded the file to validate its dimensions, so it
 * can hand that bitmap over rather than paying for a second decode. Ownership
 * transfers with it — this function closes it.
 */
export async function compressImage(
  file: File,
  bitmap?: ImageBitmap,
): Promise<CompressionResult> {
  const originalBytes = file.size;
  const unchanged: CompressionResult = { file, originalBytes, compressed: false };

  let source = bitmap;
  try {
    if (!source) {
      source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    }

    const { width, height } = source;
    const withinBounds = width <= MAX_EDGE && height <= MAX_EDGE;
    if (withinBounds && originalBytes <= SKIP_BELOW_BYTES) {
      return unchanged;
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext('2d');
    if (!context) return unchanged;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', QUALITY);
    });

    // Safari before 16 hands back a PNG when asked for WebP, which is bigger
    // than the JPEG it came from. The savings check below catches that too.
    if (!blob || blob.type !== 'image/webp') return unchanged;

    const savings = 1 - blob.size / originalBytes;
    if (withinBounds && savings < MIN_SAVINGS_RATIO) return unchanged;

    return {
      file: new File([blob], toWebpName(file.name), {
        type: 'image/webp',
        lastModified: file.lastModified,
      }),
      originalBytes,
      compressed: true,
    };
  } catch {
    return unchanged;
  } finally {
    source?.close();
  }
}

function toWebpName(name: string) {
  const stem = name.replace(/\.[^./\\]+$/, '');
  return `${stem || 'imagen'}.webp`;
}
