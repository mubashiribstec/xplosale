import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

// One-time admin bootstrap. Requires:
//   1. A valid session (authenticated user)
//   2. The BOOTSTRAP_TOKEN header matching the ADMIN_BOOTSTRAP_TOKEN env var
//   3. No existing admin in the database
//
// After first use, the ADMIN_BOOTSTRAP_TOKEN env var should be removed to
// permanently disable this endpoint.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);

    // Require explicit bootstrap token so any logged-in user cannot self-promote
    const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!bootstrapToken) {
      return err("Bootstrap is disabled. Set ADMIN_BOOTSTRAP_TOKEN in environment to enable.", 403);
    }
    const providedToken = req.headers.get("x-bootstrap-token");
    if (!providedToken || providedToken !== bootstrapToken) {
      return err("Invalid bootstrap token", 403);
    }

    const userId = getUserId(session);

    // Only works when no admin exists yet
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) return err("An admin account already exists", 409);

    await prisma.user.update({
      where: { id: userId },
      data: {
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        hasVerifiedBadge: true,
      },
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
