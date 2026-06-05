import type { PrismaClient } from "@prisma/client";

const DEFAULT_STAGES = [
  { name: "Applied",    order: 0, color: "#6B7280", isInitial: true,  isHired: false, isRejected: false },
  { name: "Screening",  order: 1, color: "#3B82F6", isInitial: false, isHired: false, isRejected: false },
  { name: "Interview",  order: 2, color: "#8B5CF6", isInitial: false, isHired: false, isRejected: false },
  { name: "Offer",      order: 3, color: "#F59E0B", isInitial: false, isHired: false, isRejected: false },
  { name: "Hired",      order: 4, color: "#10B981", isInitial: false, isHired: true,  isRejected: false },
  { name: "Rejected",   order: 5, color: "#EF4444", isInitial: false, isHired: false, isRejected: true  },
];

// Accept PrismaClient or transaction client — both expose .pipelineStage
export async function seedDefaultStages(
  companyId: string,
  tx: Pick<PrismaClient, "pipelineStage">
) {
  await tx.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s) => ({ ...s, companyId })),
    skipDuplicates: true,
  });
}
