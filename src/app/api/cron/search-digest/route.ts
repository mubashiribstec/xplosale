import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { NotificationKind } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.RECOMMENDATION_CRON_SECRET) {
      return err("Forbidden", 403);
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Process in batches of 500 to avoid loading the full table into memory
    const BATCH_SIZE = 500;
    let cursor: string | undefined;
    let processed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const searches = await prisma.savedSearch.findMany({
        where: { frequency: { not: "OFF" } },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
      });

      if (searches.length === 0) break;
      cursor = searches[searches.length - 1].id;

      for (const search of searches) {
        const isDue =
          search.frequency === "DAILY"
            ? search.lastSentAt === null || search.lastSentAt < oneDayAgo
            : search.frequency === "WEEKLY"
            ? search.lastSentAt === null || search.lastSentAt < sevenDaysAgo
            : false;

        if (!isDue) continue;

        await prisma.notification.create({
          data: {
            userId: search.userId,
            kind: NotificationKind.SAVED_SEARCH_DIGEST,
            payload: {
              message: `New results for your saved search: ${search.name}`,
              searchId: search.id,
              vertical: search.vertical,
              queryJson: search.queryJson,
            },
          },
        });

        await prisma.savedSearch.update({
          where: { id: search.id },
          data: { lastSentAt: now },
        });

        processed++;
      }

      if (searches.length < BATCH_SIZE) break;
    }

    return ok({ processed });
  } catch (e) {
    return parseError(e);
  }
}
