const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_PDF_SIZE   =  5 * 1024 * 1024;

export function detectMimeType(buf: Buffer): string | null {
  for (const [mime, patterns] of Object.entries(MAGIC)) {
    for (const pattern of patterns) {
      if (pattern.every((b, i) => buf[i] === b)) {
        if (mime === 'image/webp') {
          const marker = buf.slice(8, 12).toString('ascii');
          if (marker !== 'WEBP') continue;
        }
        return mime;
      }
    }
  }
  return null;
}

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

export async function processImage(
  buf: Buffer,
  opts: { maxWidth: number; maxHeight: number }
): Promise<ProcessedImage> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(buf)
    .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, contentType: 'image/webp' };
}
