import { prisma } from "@/lib/prisma";

export async function logAdminAction(input: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
}) {
  return prisma.adminActionLog.create({ data: input });
}
