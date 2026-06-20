import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { effectiveRate, getCommissionBalance } from "@/verticals/shops/commission";

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id]/commission — billing mode, rate, outstanding balance, recent ledger (owner or admin). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as { role?: string }).role === "ADMIN";

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true, billingMode: true, commissionRate: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (!isAdmin && shop.ownerUserId !== userId) return err("Forbidden", 403);

    const [balance, entries] = await Promise.all([
      getCommissionBalance(shopId),
      prisma.commissionLedgerEntry.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, amount: true, rate: true, orderTotal: true, note: true, createdAt: true },
      }),
    ]);

    return ok({
      billingMode: shop.billingMode,
      rate: effectiveRate(shop),
      customRate: shop.commissionRate != null ? Number(shop.commissionRate) : null,
      balance,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: Number(e.amount),
        rate: e.rate != null ? Number(e.rate) : null,
        orderTotal: e.orderTotal != null ? Number(e.orderTotal) : null,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return parseError(e);
  }
}
