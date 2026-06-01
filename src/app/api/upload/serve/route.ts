import { type NextRequest, NextResponse } from "next/server";
import { verifyLocalToken } from "@/core/adapters/storage";
import { requireSession } from "@/core/auth/session";
import { readFile } from "fs/promises";
import { join, normalize, sep } from "path";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  // Only used in local storage mode
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

  if (!verifyLocalToken("serve", bucket, key, exp, sig)) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 });
  }

  // Private files additionally require an authenticated session
  if (bucket === "private") {
    const session = await requireSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // Containment: keep the resolved path inside the target bucket directory
  const baseDir = join(process.cwd(), "uploads", bucket);
  const filePath = normalize(join(baseDir, key));
  if (filePath !== baseDir && !filePath.startsWith(baseDir + sep)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    const ext = key.split(".").pop()?.toLowerCase();
    const contentType = ext === "pdf" ? "application/pdf" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
}
