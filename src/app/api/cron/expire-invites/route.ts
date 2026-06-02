import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.RECOMMENDATION_CRON_SECRET) {
      return err("Forbidden", 403);
    }

    const result = await prisma.inviteToApply.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    return ok({ expired: result.count });
  } catch (e) {
    return parseError(e);
  }
}
