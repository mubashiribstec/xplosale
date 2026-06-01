import { ApplicationStatus } from "@prisma/client";

type Stage = { id: string; isInitial: boolean; isHired: boolean; isRejected: boolean; order: number };

export function resolveStageForStatus(
  status: ApplicationStatus,
  stages: Stage[]
): Stage | undefined {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  switch (status) {
    case "APPLIED":
      return sorted.find((s) => s.isInitial) ?? sorted[0];
    case "REVIEWED":
      return sorted.find((s) => s.order === 1) ?? sorted[1];
    case "SHORTLISTED":
      return sorted.find((s) => s.order === 2) ?? sorted[2];
    case "HIRED":
      return sorted.find((s) => s.isHired) ?? sorted[sorted.length - 2];
    case "REJECTED":
      return sorted.find((s) => s.isRejected) ?? sorted[sorted.length - 1];
    default:
      return sorted[0];
  }
}
