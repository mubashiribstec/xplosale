import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const record = await prisma.candidateDoNotContact.findUnique({
      where: { userId },
    });

    return ok({ optedOut: record !== null });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    await prisma.candidateDoNotContact.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return ok({ optedOut: true });
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    await prisma.candidateDoNotContact.deleteMany({
      where: { userId },
    });

    return ok({ optedOut: false });
  } catch (e) {
    return parseError(e);
  }
}
