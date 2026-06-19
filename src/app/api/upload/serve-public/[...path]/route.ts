import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, normalize, sep } from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");

  // Containment: resolve the path and ensure it stays inside uploads/public.
  // Prevents traversal (e.g. ../../private/cnic/<user>/front.jpg or ../../../etc/passwd).
  const baseDir = join(process.cwd(), "uploads", "public");
  const filePath = normalize(join(baseDir, key));
  if (filePath !== baseDir && !filePath.startsWith(baseDir + sep)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    const ext = key.split(".").pop()?.toLowerCase();
    const contentType = ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        // Never let the browser sniff a different type from the bytes.
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }
}
