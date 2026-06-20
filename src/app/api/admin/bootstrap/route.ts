import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

// One-time admin bootstrap — creates the first admin account.
//
// Requires:
//   1. The BOOTSTRAP_TOKEN header matching ADMIN_BOOTSTRAP_TOKEN env var
//   2. No existing admin in the database
//
// Body: { username, password }  — the predefined admin credentials to store
//
// After first use, remove ADMIN_BOOTSTRAP_TOKEN from the environment to
// permanently disable this endpoint.

const schema = z.object({
  username: z.string().min(3).max(40).toLowerCase().trim(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const bootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!bootstrapToken) {
      return err("Bootstrap is disabled. Set ADMIN_BOOTSTRAP_TOKEN in environment to enable.", 403);
    }
    const providedToken = req.headers.get("x-bootstrap-token");
    if (!providedToken || providedToken !== bootstrapToken) {
      return err("Invalid bootstrap token", 403);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { username, password } = parsed.data;

    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) return err("An admin account already exists", 409);

    const usernameConflict = await prisma.user.findUnique({ where: { username } });
    if (usernameConflict) return err("Username is already taken", 409);

    const passwordHash = hashPassword(password);

    const admin = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        hasVerifiedBadge: true,
        isSuperAdmin: true,
        name: username,
      },
      select: { id: true, username: true, role: true },
    });

    return ok({ ok: true, adminId: admin.id, username: admin.username });
  } catch (e) {
    return parseError(e);
  }
}
