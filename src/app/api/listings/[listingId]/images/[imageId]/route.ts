import { type NextRequest } from 'next/server';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';
import { deleteObject } from '@/core/adapters/storage';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string; imageId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err('Unauthorized', 401);
    const userId = getUserId(session);

    const { listingId, imageId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err('Listing not found', 404);
    if (listing.sellerProfile.userId !== userId) return err('Forbidden', 403);

    const image = await prisma.listingImage.findFirst({
      where: { id: imageId, listingId },
    });
    if (!image) return err('Image not found', 404);

    await deleteObject('public', image.url);
    await prisma.listingImage.delete({ where: { id: imageId } });

    return ok({ deleted: true });
  } catch (e) { return parseError(e); }
}
