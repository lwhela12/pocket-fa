import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// AWS S3 Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || '';

// For Vercel deployment, use environment variables for credentials
// Vercel will provide these from environment variables you set in dashboard
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Uses default credential chain if not provided
});

/**
 * Upload a file to S3
 * @param fileBuffer - The file content as a Buffer
 * @param key - The S3 object key (path/filename in bucket)
 * @param contentType - The MIME type of the file
 * @returns The S3 key of the uploaded file
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  key: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  if (!AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Metadata for tracking
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);
    return key;
  } catch (error: any) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Delete a file from S3
 * @param key - The S3 object key to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error: any) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
}

/**
 * Generate a presigned URL for secure file download
 * @param key - The S3 object key
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns A signed URL that expires after the specified time
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error('S3 presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Check if a file exists in S3
 * @param key - The S3 object key to check
 * @returns True if the file exists, false otherwise
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  if (!AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Generate a unique S3 key for a file
 * @param userId - The user ID
 * @param filename - The original filename
 * @param prefix - Optional prefix (e.g., 'statements' or 'bank-statements')
 * @returns A unique S3 key
 */
export function generateS3Key(
  userId: string,
  filename: string,
  prefix: string = 'statements'
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${userId}/${timestamp}-${sanitizedFilename}`;
}
