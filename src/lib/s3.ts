let _s3ClientInstance: any = null;

/**
 * Lazy loads and returns the singleton S3Client instance on demand.
 */
export async function getS3Client() {
  if (!_s3ClientInstance) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    _s3ClientInstance = new S3Client({
      region: import.meta.env.VITE_S3_REGION || 'auto',
      endpoint: import.meta.env.VITE_S3_ENDPOINT,
      credentials: {
        accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY_ID || '',
        secretAccessKey: import.meta.env.VITE_S3_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return _s3ClientInstance;
}

export const S3_BUCKET = import.meta.env.VITE_S3_BUCKET_NAME || '';
