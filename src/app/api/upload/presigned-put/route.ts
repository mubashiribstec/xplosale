import { type NextRequest, NextResponse } from "next/server";
import { verifyLocalToken } from "@/core/adapters/storage";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname, normalize, sep } from "path";
import { env } from "@/lib/env";

const ALLOWED_BUCKETS = new Set(["public", "private"]);

export async function PUT(req: NextRequest) {
  if (env.STORAGE_MODE !== "local") {
    return NextResponse.json({ ok: false, error: "Not available in S3 mode" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const bucket = searchParams.get("bucket");
  const key = searchParams.get("key");
  const exp = parseInt(searchParams.get("exp") ?? "0", 10);
  const sig = searchParams.get("sig");

  if (!bucket || !ALLOWED_BUCKETS.has(bucket) || !key || !exp || !sig) {
    return NextResponse.json({ ok: false, error: "Missing or invalid params" }, { status: 400 });
  }

  if (!verifyLocalToken("put", bucket as "public" | "private", key, exp, sig)) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 });
  }

  const body = await req.arrayBuffer();
  if (body.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large (max 10MB)" }, { status: 413 });
  }

  // Path traversal protection: resolve and verify the path stays inside the uploads directory
  const baseDir = join(process.cwd(), "uploads", bucket);
  const filePath = normalize(join(baseDir, key));
  if (filePath !== baseDir && !filePath.startsWith(baseDir + sep)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(body));

  return new NextResponse(null, { status: 200 });
}
