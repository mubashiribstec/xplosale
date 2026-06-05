import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

// A user is considered "online" if seen within the last 5 minutes
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const verificationStatus = searchParams.get("verificationStatus") ?? "";
    const online = searchParams.get("online") === "true";
    const bannedOnly = searchParams.get("banned") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10)));

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(role
        ? { role: role as "USER" | "EMPLOYER" | "PARTNER" | "ADMIN" }
        : {}),
      ...(verificationStatus
        ? {
            verificationStatus: verificationStatus as
              | "UNVERIFIED"
              | "PENDING"
              | "VERIFIED"
              | "REJECTED",
          }
        : {}),
      ...(online
        ? { lastSeenAt: { gte: new Date(Date.now() - ONLINE_WINDOW_MS) } }
        : {}),
      ...(bannedOnly ? { bannedAt: { not: null } } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          image: true,
          role: true,
          verificationStatus: true,
          hasVerifiedBadge: true,
          isPartner: true,
          bannedAt: true,
          lastSeenAt: true,
          createdAt: true,
          sellerProfile: { select: { id: true } },
          networkProfile: { select: { handle: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}
