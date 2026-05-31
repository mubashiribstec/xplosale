/**
 * Browser-safe helper to resolve a storage key to a public URL.
 * Reads NEXT_PUBLIC_STORAGE_MODE and NEXT_PUBLIC_SUPABASE_* env vars
 * so it can run in both server and client contexts without importing fs/path.
 */
export function getPublicUrl(key: string): string {
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE ?? process.env.STORAGE_MODE ?? "local";
  if (mode === "local") {
    return `/uploads/public/${key}`;
  }
  const endpoint = process.env.NEXT_PUBLIC_SUPABASE_S3_ENDPOINT ?? process.env.SUPABASE_S3_ENDPOINT ?? "";
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_BUCKET ?? process.env.SUPABASE_PUBLIC_BUCKET ?? "xplosale-public";
  return `${endpoint.replace("/storage/v1/s3", "")}/storage/v1/object/public/${bucket}/${key}`;
}
