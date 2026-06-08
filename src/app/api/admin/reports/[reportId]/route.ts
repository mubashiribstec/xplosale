import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["dismiss", "reject_listing"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const session = await getSession();
    const isAdmin = session && (session.user as { role: string }).role === "ADMIN";
    if (!isAdmin) return err("Forbidden", 403);
    const adminId = getUserId(session!);

    const { reportId } = await params;

    const report = await prisma.listingReport.findUnique({
      where: { id: reportId },
      select: { id: true, listingId: true, resolved: true },
    });
    if (!report) return err("Report not found", 404);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action, reason } = parsed.data;

    if (action === "dismiss") {
      await prisma.$transaction([
        prisma.listingReport.update({
          where: { id: reportId },
          data: { resolved: true },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "REPORT_RESOLVED",
            targetType: "ListingReport",
            targetId: reportId,
            reason,
          },
        }),
      ]);
    } else {
      // action === "reject_listing"
      await prisma.$transaction([
        prisma.listingReport.update({
          where: { id: reportId },
          data: { resolved: true },
        }),
        prisma.listing.update({
          where: { id: report.listingId },
          data: { status: "REJECTED" },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "LISTING_REJECTED_VIA_REPORT",
            targetType: "Listing",
            targetId: report.listingId,
            reason,
          },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "REPORT_RESOLVED",
            targetType: "ListingReport",
            targetId: reportId,
            reason,
          },
        }),
      ]);
    }

    return ok({ resolved: true });
  } catch (e) {
    return parseError(e);
  }
}
