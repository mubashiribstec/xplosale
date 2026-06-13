import { redirect, notFound } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import TemplateManager from "@/components/shared/ats/TemplateManager";
import Link from "next/link";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { companyId } = await params;
  const userRole = (session.user as { role: string }).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, ownerId: true },
  });

  if (!company) notFound();

  const isOwner = company.ownerId === userId;
  const isAdmin = userRole === "ADMIN";
  if (!isOwner && !isAdmin) redirect("/");

  const templates = await prisma.emailTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/me/employer/jobs"
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: "var(--ink-faint)" }}
            >
              ← All jobs
            </Link>
            <h1 className="mt-2 text-xl font-bold" style={{ color: "var(--ink)" }}>Email templates</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-faint)" }}>{company.name}</p>
          </div>
        </div>

        <TemplateManager companyId={companyId} initialTemplates={templates} />
      </div>
    </main>
  );
}
