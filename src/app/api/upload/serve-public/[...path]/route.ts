import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  try {
    const filePath = join(process.cwd(), "uploads", "public", key);
    const data = await readFile(filePath);
    const ext = key.split(".").pop()?.toLowerCase();
    const contentType = ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
}
