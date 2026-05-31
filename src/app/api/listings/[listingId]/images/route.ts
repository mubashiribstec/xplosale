import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, err, parseError } from '@/lib/http';
import { requireSession, getUserId } from '@/core/auth/session';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  key:    z.string().min(1),
  width:  z.number().int().positive(),
  height: z.number().int().positive(),
  order:  z.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err('Unauthorized', 401);
    const userId = getUserId(session);

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err('Listing not found', 404);
    if (listing.sellerProfile.userId !== userId) return err('Forbidden', 403);

    const count = await prisma.listingImage.count({ where: { listingId } });
    if (count >= 10) return err('Maximum 10 images per listing', 422);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err('Validation error', 422, parsed.error.flatten().fieldErrors);

    const { key, width, height, order } = parsed.data;

    const image = await prisma.listingImage.create({
      data: { listingId, url: key, order, width, height },
    });

    return ok(image);
  } catch (e) { return parseError(e); }
}
