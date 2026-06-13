import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import HiringTeamManager from "@/components/shared/ats/HiringTeamManager";

export default async function HiringTeamPage({
  params,
}: {
  params: Promise<{ companyId: string; jobId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { companyId, jobId } = await params;

  const [company, job] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { ownerId: true, name: true } }),
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, companyId: true },
    }),
  ]);

  if (!company || !job || job.companyId !== companyId) notFound();

  const userRole = (session.user as { role: string }).role;
  const isOwner = company.ownerId === userId;
  const isAdmin = userRole === "ADMIN";
  if (!isOwner && !isAdmin) redirect("/");

  const team = await prisma.hiringTeam.findMany({
    where: { jobPostingId: jobId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          networkProfile: { select: { handle: true, profilePhotoUrl: true } },
        },
      },
    },
    orderBy: { addedAt: "asc" },
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link
            href={`/employer/${companyId}/jobs/${jobId}/pipeline`}
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink-faint)" }}
          >
            ← Back to pipeline
          </Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)" }}>Hiring Team</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-faint)" }}>
            {job.title} — {company.name}
          </p>
        </div>

        <HiringTeamManager
          jobId={jobId}
          initialTeam={team.map((m) => ({
            id: m.id,
            role: m.role,
            addedAt: m.addedAt.toISOString(),
            user: m.user,
          }))}
        />
      </div>
    </main>
  );
}
