import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: import.meta.env.VITE_S3_REGION || "auto",
  endpoint: import.meta.env.VITE_S3_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY_ID || "",
    secretAccessKey: import.meta.env.VITE_S3_SECRET_ACCESS_KEY || "",
  },
});

export const S3_BUCKET = import.meta.env.VITE_S3_BUCKET_NAME || "";
