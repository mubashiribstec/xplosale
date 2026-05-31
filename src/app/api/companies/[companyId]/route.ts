import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        region: true,
        jobPostings: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!company) return err("Company not found", 404);

    const owner = await prisma.user.findUnique({
      where: { id: company.ownerId },
      select: { id: true, name: true },
    });

    return ok({ ...company, owner });
  } catch (e) {
    return parseError(e);
  }
}
