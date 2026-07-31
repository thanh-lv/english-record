import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_BUCKET, s3Client } from "../lib/s3";

/**
 * Service handling file uploads to S3 / Cloudflare R2
 */
export const uploadService = {
  async uploadFile(
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

    const publicDomain =
      import.meta.env.VITE_S3_PUBLIC_DOMAIN ||
      import.meta.env.VITE_R2_PUBLIC_URL;
    if (publicDomain) {
      return `${publicDomain.replace(/\/$/, "")}/${filename}`;
    }

    const endpoint = import.meta.env.VITE_S3_ENDPOINT || "";
    return `${endpoint.replace(/\/$/, "")}/${S3_BUCKET}/${filename}`;
  },
};

export const uploadToStorage = uploadService.uploadFile;
