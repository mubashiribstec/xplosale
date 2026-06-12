import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";

interface Params {
  params: Promise<{ id: string }>;
}

/** POST /api/shops/[id]/favourite — save a shop to the user's favourites. */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;
    const shop = await prisma.shop.findUnique({ where: { id }, select: { status: true } });
    if (!shop || shop.status !== "ACTIVE") return err("Shop not found", 404);

    try {
      await prisma.shopFavourite.create({ data: { shopId: id, userId } });
    } catch (e) {
      // Already favourited — treat as success (idempotent)
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }

    return ok({ favourited: true });
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/shops/[id]/favourite — remove a shop from favourites. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;
    await prisma.shopFavourite.deleteMany({ where: { shopId: id, userId } });

    return ok({ favourited: false });
  } catch (e) {
    return parseError(e);
  }
}
