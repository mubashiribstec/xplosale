import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  username: z.string().min(3).max(40).toLowerCase().trim(),
  password: z.string().min(8),
});

// This endpoint only works when NO admin exists in the database.
// Once the first admin is created it becomes permanently disabled.
export async function POST(req: NextRequest) {
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) {
      return err("Admin account already exists. Use /admin/login to sign in.", 409);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { username, password } = parsed.data;

    const usernameConflict = await prisma.user.findUnique({ where: { username } });
    if (usernameConflict) return err("Username is already taken.", 409);

    await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        hasVerifiedBadge: true,
        name: username,
      },
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
