import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, s3Client } from "../lib/s3";

/**
 * Upload a file (File/Blob) to Cloudflare R2 / S3 storage
 * @param file File or Blob to upload
 * @param folder Target folder prefix (e.g. 'topics', 'stories', 'vocab')
 * @returns Public URL of the uploaded asset
 */
export async function uploadToStorage(
  file: File | Blob,
  folder: string = "uploads",
): Promise<string> {
  const ext = file.type.split("/")[1] || "png";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: filename,
    Body: uint8Array,
    ContentType: file.type || "application/octet-stream",
  });

  await s3Client.send(command);

  // Return public URL based on Cloudflare R2 / S3 Endpoint or Custom domain
  const publicDomain = import.meta.env.VITE_S3_PUBLIC_DOMAIN;
  if (publicDomain) {
    return `${publicDomain.replace(/\/$/, "")}/${filename}`;
  }

  // Fallback to endpoint path
  const endpoint = import.meta.env.VITE_S3_ENDPOINT || "";
  return `${endpoint.replace(/\/$/, "")}/${S3_BUCKET}/${filename}`;
}
