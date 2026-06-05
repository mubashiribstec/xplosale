import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type NextRequest } from "next/server";
import { seedDefaultStages } from "@/verticals/jobs/ats/seed-stages";

const schema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  regionId: z.string().optional(),
  roleAtCompany: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const profile = await prisma.employerProfile.findUnique({
      where: { userId: getUserId(session) },
      include: { company: true },
    });
    return ok(profile);
  } catch (e) { return parseError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { companyName, industry, size, websiteUrl, regionId, roleAtCompany } = parsed.data;

    // Get first available region if none provided
    const region = regionId
      ? await prisma.region.findUnique({ where: { id: regionId } })
      : await prisma.region.findFirst();
    if (!region) return err("No region found", 400);

    const existing = await prisma.employerProfile.findUnique({
      where: { userId },
      include: { company: true },
    });

    let profile;
    if (existing) {
      // Update existing company + profile atomically
      profile = await prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: existing.companyId },
          data: { name: companyName, industry, size, websiteUrl: websiteUrl || undefined, regionId: region.id },
        });
        return tx.employerProfile.update({
          where: { userId },
          data: { roleAtCompany },
          include: { company: true },
        });
      });
    } else {
      // Create company + profile atomically, then seed default pipeline stages
      const result = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { ownerId: userId, name: companyName, industry, size, websiteUrl: websiteUrl || undefined, regionId: region.id },
        });
        await seedDefaultStages(company.id, tx);
        return tx.employerProfile.create({
          data: { userId, companyId: company.id, roleAtCompany },
          include: { company: true },
        });
      });
      profile = result;
    }

    await prisma.user.update({ where: { id: userId }, data: { role: "PARTNER" } });

    return ok(profile);
  } catch (e) { return parseError(e); }
}
