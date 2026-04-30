import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Cloudflare R2 is S3-compatible — same SDK, different endpoint. */
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB

/**
 * Generate a short-lived presigned PUT URL so the client can upload
 * directly to R2 without routing the file body through our server.
 */
export async function createPresignedUploadUrl({
  key,
  contentType,
  contentLength,
}: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not set");

  const client = getR2Client();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  // URL valid for 5 minutes
  return getSignedUrl(client, cmd, { expiresIn: 300 });
}

/** Permanently remove an object from R2. */
export async function deleteR2Object(key: string) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not set");
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Build the public URL for a stored key.
 * Uses R2_PUBLIC_URL if the bucket has a public domain / custom domain configured,
 * otherwise falls back to the account endpoint (requires public access).
 */
export function r2PublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL ?? "";
  if (!base) throw new Error("R2_PUBLIC_URL not set");
  return `${base.replace(/\/$/, "")}/${key}`;
}
