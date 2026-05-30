import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

function makeS3Client() {
  return new S3Client({
    endpoint: env.SUPABASE_S3_ENDPOINT,
    region: env.SUPABASE_S3_REGION,
    credentials: {
      accessKeyId: env.SUPABASE_S3_ACCESS_KEY,
      secretAccessKey: env.SUPABASE_S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __s3: S3Client | undefined;
}

function getS3(): S3Client {
  if (!globalThis.__s3) globalThis.__s3 = makeS3Client();
  return globalThis.__s3;
}

export type StorageBucket = "public" | "private";

function bucketName(bucket: StorageBucket): string {
  return bucket === "public" ? env.SUPABASE_PUBLIC_BUCKET : env.SUPABASE_PRIVATE_BUCKET;
}

export async function putObject(
  bucket: StorageBucket,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const Bucket = bucketName(bucket);
  await getS3().send(
    new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType })
  );
  return key;
}

export async function getPresignedPut(
  bucket: StorageBucket,
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const Bucket = bucketName(bucket);
  return getSignedUrl(
    getS3(),
    new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function getPresignedGet(
  bucket: StorageBucket,
  key: string,
  expiresIn = 60
): Promise<string> {
  const Bucket = bucketName(bucket);
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket, Key: key }),
    { expiresIn }
  );
}

export async function deleteObject(bucket: StorageBucket, key: string): Promise<void> {
  const Bucket = bucketName(bucket);
  await getS3().send(new DeleteObjectCommand({ Bucket, Key: key }));
}

export function getPublicUrl(key: string): string {
  // Public bucket objects are accessible directly via the Supabase storage URL
  return `${env.SUPABASE_S3_ENDPOINT.replace("/storage/v1/s3", "")}/storage/v1/object/public/${env.SUPABASE_PUBLIC_BUCKET}/${key}`;
}
