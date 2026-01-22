import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary if credentials are available
function initializeCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

  console.log(`🔍 Cloudinary Config Check:`, {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    cloudName: cloudName || 'NOT SET',
  });

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    console.log(`✅ Cloudinary initialized (cloud: ${cloudName})`);
    return true;
  } else {
    console.warn('⚠️  Cloudinary credentials not found in environment');
    return false;
  }
}

// Initialize on module load
let cloudinaryInitialized = initializeCloudinary();

// R2 Storage configuration (alternative)
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'daily-protagonist-images';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Create R2/S3 client
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    // Check if R2 credentials are configured
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured. Please set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY environment variables.');
    }

    // Determine the endpoint
    // If R2_ACCOUNT_ID is provided, use R2 endpoint
    // Otherwise, use custom endpoint or default to standard S3
    let endpoint: string | undefined;
    if (R2_ACCOUNT_ID) {
      endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    console.log(`✅ S3/R2 client initialized (bucket: ${R2_BUCKET_NAME})`);
  }

  return s3Client;
}

/**
 * Generate a unique key for storing a photo
 */
function generatePhotoKey(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || 'jpg';
  return `photos/${userId}/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
}

/**
 * Get Cloudinary credentials at runtime
 */
function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  };
}

/**
 * Check if Cloudinary is configured at runtime
 */
function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig();
  return !!(config.cloudName && config.apiKey && config.apiSecret);
}

/**
 * Upload a photo to Cloudinary
 * @param buffer - The file buffer to upload
 * @param userId - The user ID for organizing the file
 * @param fileName - Original filename
 * @returns The public URL of the uploaded file
 */
async function uploadToCloudinary(
  buffer: Buffer,
  userId: string,
  fileName: string
): Promise<string> {
  // Ensure Cloudinary is initialized
  if (!cloudinaryInitialized) {
    cloudinaryInitialized = initializeCloudinary();
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `daily-protagonist/photos/${userId}`,
        resource_type: 'image',
        public_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          console.log(`✅ Photo uploaded successfully to Cloudinary: ${result.secure_url}`);
          resolve(result.secure_url);
        } else {
          reject(new Error('No result from Cloudinary upload'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a photo to Cloudinary or R2/S3 storage
 * Priority: Cloudinary > R2 > Base64 fallback
 * @param buffer - The file buffer to upload
 * @param contentType - The MIME type of the file
 * @param userId - The user ID for organizing the file
 * @param fileName - Original filename (used for extension)
 * @returns The public URL of the uploaded file
 */
export async function uploadPhoto(
  buffer: Buffer,
  contentType: string,
  userId: string,
  fileName: string
): Promise<string> {
  // Priority 1: Try Cloudinary (recommended) - check at runtime
  if (isCloudinaryConfigured()) {
    try {
      console.log('☁️  Uploading to Cloudinary...');
      return await uploadToCloudinary(buffer, userId, fileName);
    } catch (error) {
      console.error('❌ Failed to upload to Cloudinary:', error);
      console.log('📦 Falling back to base64 encoding');
      return fallbackToBase64(buffer, contentType);
    }
  }

  // Priority 2: Try R2
  if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    try {
      const client = getS3Client();
      const key = generatePhotoKey(userId, fileName);

      console.log(`📤 Uploading photo to R2: ${key}`);

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await client.send(command);

      // Generate the public URL
      const publicUrl = `${R2_PUBLIC_URL}/${key}`;
      console.log(`✅ Photo uploaded successfully to R2: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error('❌ Failed to upload photo to R2:', error);
      console.log('📦 Falling back to base64 encoding');
      return fallbackToBase64(buffer, contentType);
    }
  }

  // Priority 3: Fallback to base64
  console.warn('⚠️  No storage configured (Cloudinary or R2), falling back to base64');
  return fallbackToBase64(buffer, contentType);
}

/**
 * Delete a photo from Cloudinary or R2/S3 storage
 * @param photoUrl - The public URL of the photo to delete
 */
export async function deletePhoto(photoUrl: string): Promise<void> {
  try {
    // Check if this is a Cloudinary URL
    if (photoUrl.includes('cloudinary.com')) {
      // Extract public_id from Cloudinary URL
      // Example: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/daily-protagonist/photos/user-id/filename.jpg
      const matches = photoUrl.match(/\/v\d+\/(.+)\.\w+$/);
      if (matches && matches[1]) {
        const publicId = matches[1];
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Photo deleted from Cloudinary: ${publicId} (result: ${result.result})`);
        return;
      }
    }

    // Check if this is an R2 URL
    if (photoUrl.startsWith(R2_PUBLIC_URL)) {
      // Extract the key from the URL
      const key = photoUrl.replace(R2_PUBLIC_URL + '/', '');

      const client = getS3Client();
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });

      await client.send(command);
      console.log(`✅ Photo deleted from R2: ${key}`);
      return;
    }

    console.log('⚠️  Photo is not a Cloudinary or R2 URL, skipping deletion');
  } catch (error) {
    console.error('❌ Failed to delete photo:', error);
    throw error;
  }
}

/**
 * Get a presigned URL for temporary access
 * @param photoUrl - The public URL of the photo
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns The presigned URL
 */
export async function getPresignedUrl(photoUrl: string, expiresIn: number = 3600): Promise<string> {
  try {
    // Check if this is an R2 URL
    if (!photoUrl.startsWith(R2_PUBLIC_URL)) {
      return photoUrl; // Return original URL if not R2
    }

    // Extract the key from the URL
    const key = photoUrl.replace(R2_PUBLIC_URL + '/', '');

    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('❌ Failed to generate presigned URL:', error);
    return photoUrl; // Return original URL on error
  }
}

/**
 * Fallback to base64 encoding when R2 is not available
 */
function fallbackToBase64(buffer: Buffer, contentType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

/**
 * Check if storage is properly configured
 */
export function isStorageConfigured(): boolean {
  // Check Cloudinary first (recommended) - runtime check
  if (isCloudinaryConfigured()) {
    return true;
  }
  // Check R2 as fallback
  return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

/**
 * Get storage configuration status (for debugging)
 */
export function getStorageStatus(): {
  configured: boolean;
  provider: string;
  cloudinary?: { cloudName: string };
  r2?: { bucket: string; publicUrl: string; hasCredentials: boolean };
} {
  const cloudConfig = getCloudinaryConfig();
  const hasCloudinary = !!(cloudConfig.cloudName && cloudConfig.apiKey && cloudConfig.apiSecret);
  const hasR2 = !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);

  return {
    configured: hasCloudinary || hasR2,
    provider: hasCloudinary ? 'cloudinary' : hasR2 ? 'r2' : 'none',
    ...(hasCloudinary && {
      cloudinary: {
        cloudName: cloudConfig.cloudName,
      },
    }),
    ...(hasR2 && {
      r2: {
        bucket: R2_BUCKET_NAME,
        publicUrl: R2_PUBLIC_URL ? '*** configured ***' : 'not set',
        hasCredentials: true,
      },
    }),
  };
}
