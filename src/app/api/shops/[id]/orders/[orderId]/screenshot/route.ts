/**
 * POST /api/shops/[id]/orders/[orderId]/screenshot
 * Customer uploads a payment screenshot; sets order status to PAYMENT_SUBMITTED.
 */

import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { putObject, getPublicUrl } from "@/core/adapters/storage";
import { detectMimeType, processImage, MAX_IMAGE_SIZE } from "@/core/media/pipeline";

type Params = { params: Promise<{ id: string; orderId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const customerId = getUserId(session);

    const { id: shopId, orderId } = await params;
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId, shopId },
      select: { id: true, customerId: true, status: true, paymentMethod: true },
    });

    if (!order) return err("Order not found", 404);
    if (order.customerId !== customerId) return err("Forbidden", 403);
    if (order.paymentMethod === "CASH") return err("Cash orders do not require a screenshot", 422);
    if (!["PENDING", "PAYMENT_SUBMITTED"].includes(order.status))
      return err("Cannot upload screenshot in current order status", 422);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return err("No file provided", 422);
    if (file.size > MAX_IMAGE_SIZE) return err("File exceeds 10 MB limit", 422);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return err("Unsupported file type. Must be JPEG, PNG, or WebP", 422);
    }

    const processed = await processImage(buf, { maxWidth: 1200, maxHeight: 1600 });
    const key = `screenshots/${orderId}/${crypto.randomUUID()}.webp`;
    await putObject("public", key, processed.data, processed.contentType);
    const screenshotUrl = getPublicUrl(key);

    const updated = await prisma.shopOrder.update({
      where: { id: orderId },
      data: { screenshotUrl, status: "PAYMENT_SUBMITTED" },
      select: { id: true, status: true, screenshotUrl: true },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
