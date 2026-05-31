import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getPresignedPut } from "@/core/adapters/storage";
import { requireSession, getUserId } from "@/core/auth/session";

const bodySchema = z.object({
  fileType: z.enum(["front", "back", "selfie"]),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  docType: z.enum(["CNIC", "PASSPORT"]).default("CNIC"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);

    const userId = getUserId(session);
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { fileType, contentType, docType } = parsed.data;

    // Passport has no back page
    if (docType === "PASSPORT" && fileType === "back") {
      return err("Passport verification does not require a back image", 422);
    }

    const folder = docType === "PASSPORT" ? "passport" : "cnic";
    const key = `${folder}/${userId}/${fileType}.jpg`;
    const url = await getPresignedPut("private", key, contentType, 300);

    return ok({ url, key });
  } catch (e) {
    return parseError(e);
  }
}
