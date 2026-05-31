import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { putObject, getPublicUrl } from '@/core/adapters/storage';
import { detectMimeType, processImage, MAX_IMAGE_SIZE } from '@/core/media/pipeline';

const purposeSchema = z.enum(['profile_photo', 'banner', 'listing_image']);

const dimensionMap: Record<string, { maxWidth: number; maxHeight: number }> = {
  profile_photo: { maxWidth: 512, maxHeight: 512 },
  banner:        { maxWidth: 1200, maxHeight: 400 },
  listing_image: { maxWidth: 1200, maxHeight: 900 },
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err('Unauthorized', 401);
    const userId = getUserId(session);

    const { searchParams } = new URL(req.url);
    const purposeResult = purposeSchema.safeParse(searchParams.get('purpose'));
    if (!purposeResult.success) return err('Invalid purpose', 422);
    const purpose = purposeResult.data;

    const listingId = searchParams.get('listingId');
    if (purpose === 'listing_image' && !listingId) {
      return err('listingId is required for listing_image', 422);
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return err('No file provided', 422);

    if (file.size > MAX_IMAGE_SIZE) return err('File exceeds 10 MB limit', 422);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      return err('Unsupported file type. Must be JPEG, PNG, or WebP', 422);
    }

    const dims = dimensionMap[purpose];
    const processed = await processImage(buf, dims);

    let key: string;
    if (purpose === 'profile_photo') {
      key = `photos/${userId}/${crypto.randomUUID()}.webp`;
    } else if (purpose === 'banner') {
      key = `banners/${userId}/${crypto.randomUUID()}.webp`;
    } else {
      key = `listings/${listingId}/${crypto.randomUUID()}.webp`;
    }

    await putObject('public', key, processed.data, processed.contentType);
    const url = getPublicUrl(key);

    return ok({ key, url, width: processed.width, height: processed.height });
  } catch (e) { return parseError(e); }
}
