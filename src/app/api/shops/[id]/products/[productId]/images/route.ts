import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { putObject, getPublicUrl } from "@/core/adapters/storage";
import { detectMimeType, processImage, MAX_IMAGE_SIZE } from "@/core/media/pipeline";
import { getEffectivePlan } from "@/verticals/shops/tier";

type Params = { params: Promise<{ id: string; productId: string }> };

/** POST /api/shops/[id]/products/[productId]/images — upload a product image */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, productId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true },
    });
    if (!product || product.shopId !== shopId) return err("Product not found", 404);

    const [plan, imageCount] = await Promise.all([
      getEffectivePlan(shopId),
      prisma.shopProductImage.count({ where: { productId } }),
    ]);

    if (imageCount >= plan.maxImagesPerProduct) {
      return err(
        plan.key === "FREE"
          ? `Free shops allow up to ${plan.maxImagesPerProduct} images per product. Upgrade to Premium for more.`
          : `Your plan allows a maximum of ${plan.maxImagesPerProduct} images per product.`,
        402,
        { limit: plan.maxImagesPerProduct, current: imageCount, planKey: plan.key }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return err("No file provided", 422);
    if (file.size > MAX_IMAGE_SIZE) return err("File exceeds 10 MB limit", 422);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return err("Unsupported file type. Must be JPEG, PNG, or WebP", 422);
    }

    const processed = await processImage(buf, { maxWidth: 1200, maxHeight: 900 });
    const key = `shops/${shopId}/products/${productId}/${crypto.randomUUID()}.webp`;
    await putObject("public", key, processed.data, processed.contentType);
    const url = getPublicUrl(key);

    const image = await prisma.shopProductImage.create({
      data: { productId, url, order: imageCount, width: processed.width, height: processed.height },
    });

    return ok(image, 201);
  } catch (e) {
    return parseError(e);
  }
}
