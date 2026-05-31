import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  docType: z.enum(["CNIC", "PASSPORT"]).default("CNIC"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);
    if (user.verificationStatus === "VERIFIED") return err("Already verified", 400);
    if (user.verificationStatus === "PENDING") return ok({ message: "Already pending review" });

    const body = await req.json().catch(() => ({})) as unknown;
    const parsed = bodySchema.safeParse(body);
    const docType = parsed.success ? parsed.data.docType : "CNIC";

    await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: "PENDING", docType },
    });

    return ok({ message: "Verification request submitted" });
  } catch (e) {
    return parseError(e);
  }
}
