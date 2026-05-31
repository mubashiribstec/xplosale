import { type NextRequest, NextResponse } from "next/server";
import { verifyLocalToken } from "@/core/adapters/storage";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { env } from "@/lib/env";

export async function PUT(req: NextRequest) {
  if (env.STORAGE_MODE !== "local") {
    return NextResponse.json({ ok: false, error: "Not available in S3 mode" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const bucket = searchParams.get("bucket") as "public" | "private" | null;
  const key = searchParams.get("key");
  const exp = parseInt(searchParams.get("exp") ?? "0", 10);
  const sig = searchParams.get("sig");

  if (!bucket || !key || !exp || !sig) {
    return NextResponse.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  if (!verifyLocalToken("put", bucket, key, exp, sig)) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 });
  }

  const body = await req.arrayBuffer();
  if (body.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large (max 10MB)" }, { status: 413 });
  }

  const filePath = join(process.cwd(), "uploads", bucket, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(body));

  return new NextResponse(null, { status: 200 });
}
