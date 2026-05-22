import crypto from "crypto";

const getEndpoint = () => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * Upload a Buffer to Cloudflare R2 and return its public CDN URL.
 *
 * Requires environment variables:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} mimeType - MIME type, e.g. "image/jpeg"
 * @param {string} [ext="bin"] - File extension without dot, e.g. "jpg"
 * @returns {Promise<string>} Permanent public CDN URL
 */
export async function uploadToR2(buffer, mimeType, ext = "bin") {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: getEndpoint(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = `email-images/${crypto.randomUUID()}.${ext}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
