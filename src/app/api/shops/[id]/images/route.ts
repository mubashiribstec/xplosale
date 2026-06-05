import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { putObject, getPublicUrl } from "@/core/adapters/storage";
import { detectMimeType, processImage, MAX_IMAGE_SIZE } from "@/core/media/pipeline";

const kindSchema = z.enum(["STOREFRONT_BOARD", "GENERAL"]);

type Params = { params: Promise<{ id: string }> };

/** POST /api/shops/[id]/images — upload a shop image */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawKind = form.get("kind") as string | null;

    if (!file) return err("No file provided", 422);
    if (file.size > MAX_IMAGE_SIZE) return err("File exceeds 10 MB limit", 422);

    const kindResult = kindSchema.safeParse(rawKind ?? "GENERAL");
    if (!kindResult.success) return err("Invalid kind", 422);
    const kind = kindResult.data;

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return err("Unsupported file type. Must be JPEG, PNG, or WebP", 422);
    }

    const processed = await processImage(buf, { maxWidth: 1200, maxHeight: 900 });
    const key = `shops/${shopId}/${crypto.randomUUID()}.webp`;
    await putObject("public", key, processed.data, processed.contentType);
    const url = getPublicUrl(key);

    // For STOREFRONT_BOARD: only 1 allowed — replace any existing one
    if (kind === "STOREFRONT_BOARD") {
      const existing = await prisma.shopImage.findFirst({
        where: { shopId, kind: "STOREFRONT_BOARD" },
        select: { id: true },
      });
      if (existing) {
        await prisma.shopImage.delete({ where: { id: existing.id } });
      }
    }

    const order =
      kind === "GENERAL"
        ? await prisma.shopImage.count({ where: { shopId, kind: "GENERAL" } })
        : 0;

    const image = await prisma.shopImage.create({
      data: { shopId, url, kind, order, width: processed.width, height: processed.height },
    });

    return ok(image, 201);
  } catch (e) {
    return parseError(e);
  }
}
