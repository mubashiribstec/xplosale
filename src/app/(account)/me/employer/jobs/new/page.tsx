import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectiveJobPlan, countActiveJobPosts } from "@/verticals/jobs/tier";
import JobWizard from "@/components/shared/jobs/JobWizard";
import UpgradePrompt from "@/components/shared/shops/UpgradePrompt";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewJobPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/me/employer/jobs/new");
  const userId = getUserId(session);

  const employerProfile = await prisma.employerProfile.findUnique({ where: { userId }, include: { company: true } });
  if (!employerProfile) redirect("/me/employer/jobs");

  const [plan, activeCount] = await Promise.all([
    getEffectiveJobPlan(employerProfile.companyId),
    countActiveJobPosts(employerProfile.companyId),
  ]);

  const atLimit = activeCount >= plan.limit && plan.credits <= 0;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/me/employer/jobs"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← My Job Postings
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(26px,4vw,36px)", color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.1 }}>
          Post a Job
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          Set up your job posting in 4 quick steps. Your progress is saved automatically.
        </p>

        {atLimit ? (
          <UpgradePrompt
            message={
              plan.key === "FREE"
                ? `Free plan allows ${plan.limit} active posts. Upgrade to Monthly plan or contact admin to purchase extra credits.`
                : `Monthly plan limit (${plan.limit} posts) reached. Contact admin to add extra post credits.`
            }
          />
        ) : (
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 20,
              padding: "clamp(24px,4vw,40px)",
            }}
          >
            <JobWizard />
          </div>
        )}
      </div>
    </main>
  );
}
