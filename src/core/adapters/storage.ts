/**
 * Storage adapter — local filesystem (STORAGE_MODE=local) or Supabase S3 (STORAGE_MODE=s3).
 * All feature code calls this module; never the underlying SDK directly.
 */

import { env } from "@/lib/env";

export type StorageBucket = "public" | "private";

// ─── Local filesystem implementation ─────────────────────────────────────────

async function localPut(bucket: StorageBucket, key: string, body: Buffer | Uint8Array): Promise<void> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join, dirname } = await import("path");
  const base = join(process.cwd(), "uploads", bucket);
  await mkdir(join(base, dirname(key)), { recursive: true });
  await writeFile(join(base, key), body);
}

async function localDelete(bucket: StorageBucket, key: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  const { join } = await import("path");
  await unlink(join(process.cwd(), "uploads", bucket, key)).catch(() => {});
}

function localPublicUrl(key: string): string {
  return `/uploads/public/${key}`;
}

function localPresignedGet(bucket: StorageBucket, key: string, expiresIn: number): string {
  if (bucket === "public") return localPublicUrl(key);
  // Private files served via /api/upload/serve with a short-lived HMAC token
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const sig = hmacToken(`serve:${bucket}:${key}:${exp}`);
  return `/api/upload/serve?bucket=${bucket}&key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

function localPresignedPut(bucket: StorageBucket, key: string): string {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const sig = hmacToken(`put:${bucket}:${key}:${exp}`);
  return `/api/upload/presigned-put?bucket=${bucket}&key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

function hmacToken(data: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHmac("sha256", env.NEXTAUTH_SECRET).update(data).digest("hex").slice(0, 16);
}

// ─── S3 implementation ────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __s3: import("@aws-sdk/client-s3").S3Client | undefined;
}

function getS3(): import("@aws-sdk/client-s3").S3Client {
  if (!globalThis.__s3) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { S3Client } = require("@aws-sdk/client-s3") as typeof import("@aws-sdk/client-s3");
    globalThis.__s3 = new S3Client({
      endpoint: env.SUPABASE_S3_ENDPOINT!,
      region: env.SUPABASE_S3_REGION,
      credentials: {
        accessKeyId: env.SUPABASE_S3_ACCESS_KEY!,
        secretAccessKey: env.SUPABASE_S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return globalThis.__s3;
}

function bucketName(bucket: StorageBucket): string {
  return bucket === "public" ? env.SUPABASE_PUBLIC_BUCKET : env.SUPABASE_PRIVATE_BUCKET;
}

async function s3Put(bucket: StorageBucket, key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  await getS3().send(new PutObjectCommand({ Bucket: bucketName(bucket), Key: key, Body: body, ContentType: contentType }));
}

async function s3PresignedPut(bucket: StorageBucket, key: string, contentType: string, expiresIn: number): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  return getSignedUrl(getS3(), new PutObjectCommand({ Bucket: bucketName(bucket), Key: key, ContentType: contentType }), { expiresIn });
}

async function s3PresignedGet(bucket: StorageBucket, key: string, expiresIn: number): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }), { expiresIn });
}

async function s3Delete(bucket: StorageBucket, key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await getS3().send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function putObject(
  bucket: StorageBucket,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  if (env.STORAGE_MODE === "local") {
    await localPut(bucket, key, body);
  } else {
    await s3Put(bucket, key, body, contentType);
  }
  return key;
}

export async function getPresignedPut(
  bucket: StorageBucket,
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  if (env.STORAGE_MODE === "local") return localPresignedPut(bucket, key);
  return s3PresignedPut(bucket, key, contentType, expiresIn);
}

export async function getPresignedGet(
  bucket: StorageBucket,
  key: string,
  expiresIn = 60
): Promise<string> {
  if (env.STORAGE_MODE === "local") return localPresignedGet(bucket, key, expiresIn);
  return s3PresignedGet(bucket, key, expiresIn);
}

export async function deleteObject(bucket: StorageBucket, key: string): Promise<void> {
  if (env.STORAGE_MODE === "local") return localDelete(bucket, key);
  return s3Delete(bucket, key);
}

export function getPublicUrl(key: string): string {
  if (env.STORAGE_MODE === "local") return localPublicUrl(key);
  return `${env.SUPABASE_S3_ENDPOINT!.replace("/storage/v1/s3", "")}/storage/v1/object/public/${env.SUPABASE_PUBLIC_BUCKET}/${key}`;
}

/** Verify an HMAC token for local serve or presigned-put requests. */
export function verifyLocalToken(action: "serve" | "put", bucket: StorageBucket, key: string, exp: number, sig: string): boolean {
  if (Math.floor(Date.now() / 1000) > exp) return false;
  const prefix = action === "put" ? "put" : "serve";
  const expected = hmacToken(`${prefix}:${bucket}:${key}:${exp}`);
  return expected === sig;
}
