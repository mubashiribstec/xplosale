import { type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { detectMimeType, processImage } from "@/core/media/pipeline";
import { putObject, getPublicUrl } from "@/core/adapters/storage";
import { publishMessage } from "@/core/messaging/rooms";
import { rateLimit } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Params = { params: Promise<{ roomId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const limited = await rateLimit(`chat:attach:${userId}`, 20, 60);
    if (!limited.allowed) return err("Too many requests", 429);

    const { roomId } = await params;
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return err("Room not found", 404);
    if (room.participantAId !== userId && room.participantBId !== userId) return err("Forbidden", 403);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return err("file is required", 422);
    if (file.size > MAX_SIZE) return err("File too large (max 5 MB)", 422);

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = detectMimeType(buf);
    if (!mime || !ALLOWED_TYPES.includes(mime)) return err("Only images are allowed (JPEG, PNG, WebP, GIF)", 422);

    // GIF: store as-is (no WebP conversion since that loses animation)
    let finalBuf: Buffer;
    let finalMime: string;
    let width: number;
    let height: number;

    if (mime === "image/gif") {
      finalBuf = buf;
      finalMime = "image/gif";
      width = 0;
      height = 0;
    } else {
      const processed = await processImage(buf, { maxWidth: 1200, maxHeight: 1200 });
      finalBuf = processed.data;
      finalMime = processed.contentType;
      width = processed.width;
      height = processed.height;
    }

    const ext = mime === "image/gif" ? "gif" : "webp";
    const key = `chat/${roomId}/${randomUUID()}.${ext}`;
    await putObject("public", key, finalBuf, finalMime);
    const url = getPublicUrl(key);

    const msg = await prisma.message.create({
      data: {
        roomId,
        senderId: userId,
        body: "",
        kind: "ATTACHMENT",
        metadata: { url, width, height },
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    await publishMessage(roomId, msg);

    return ok(msg, 201);
  } catch (e) {
    return parseError(e);
  }
}
