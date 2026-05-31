import { prisma } from "@/lib/prisma";

export async function canAccessJobApplications(
  userId: string,
  jobId: string,
  userRole?: string
): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: {
      company: { select: { ownerId: true } },
      hiringTeam: { where: { userId }, select: { id: true } },
    },
  });

  if (!job) return false;
  if (job.company.ownerId === userId) return true;
  if (job.hiringTeam.length > 0) return true;

  return false;
}

export async function canManagePipelineStages(
  userId: string,
  companyId: string,
  userRole?: string
): Promise<boolean> {
  if (userRole === "ADMIN") return true;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { ownerId: true },
  });

  return company?.ownerId === userId;
}
