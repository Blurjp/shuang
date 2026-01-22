/**
 * Image Downloader Utility
 * Downloads images from URLs and converts to Files for API upload
 * Uses sharp to ensure RGBA format for OpenAI Image Edit API
 * Generates masks to indicate which areas to edit vs preserve
 */

import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';

/**
 * Download an image from a URL and save it as a temporary file
 * Required for Image Edit API which needs multipart/form-data
 * Converts to RGBA PNG format and ensures size < 4MB
 * Also generates a mask for the image edit API
 */
export async function downloadImageAsFile(imageUrl: string): Promise<{
  image: { name: string; path: string; mimeType: string; data: Uint8Array };
  mask: { name: string; path: string; mimeType: string; data: Uint8Array }
}> {
  console.log(`⬇️  Downloading image from: ${imageUrl.substring(0, 60)}...`);

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`📋 Content-Type: ${contentType}`);

    const buffer = await response.arrayBuffer();
    const originalBuffer = Buffer.from(buffer);

    // Detect actual image format from magic bytes
    let detectedFormat = 'unknown';
    if (originalBuffer.length > 4) {
      const header = originalBuffer.slice(0, 4);
      // PNG: 89 50 4E 47
      if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        detectedFormat = 'png';
      }
      // JPEG: FF D8 FF
      else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        detectedFormat = 'jpeg';
      }
      // WebP: RIFF....WEBP
      else if (originalBuffer.length > 12 &&
                 header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
                 originalBuffer[8] === 0x57 && originalBuffer[9] === 0x45 && originalBuffer[10] === 0x42 && originalBuffer[11] === 0x50) {
        detectedFormat = 'webp';
      }
    }

    console.log(`🔍 Detected format: ${detectedFormat}`);
    console.log(`📊 Original size: ${(originalBuffer.length / (1024 * 1024)).toFixed(2)}MB`);

    // Use sharp to convert to RGBA PNG format
    // This ensures OpenAI Image Edit API compatibility
    console.log(`🎨 Converting to RGBA PNG using sharp...`);
    const rgbaBuffer = await sharp(originalBuffer)
      .ensureAlpha()  // Add alpha channel if missing
      .toFormat('png', {
        compressionLevel: 9,  // Maximum compression
        palette: false        // Keep RGBA (not palette)
      })
      .toBuffer();

    const sizeInMB = rgbaBuffer.length / (1024 * 1024);
    console.log(`📊 Converted size: ${sizeInMB.toFixed(2)}MB (RGBA PNG)`);

    // Resize to 512x512 for cost savings (mobile display doesn't need higher resolution)
    // This significantly reduces gpt-image-1 API costs (~$32 → ~$10 per 1M tokens)
    console.log(`💰 Resizing to 512x512 for cost optimization (mobile display)...`);
    const resizedBuffer = await sharp(rgbaBuffer)
      .resize(512, 512, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .ensureAlpha()
      .toFormat('png', {
        compressionLevel: 9,
        palette: false
      })
      .toBuffer();

    const resizedSizeInMB = resizedBuffer.length / (1024 * 1024);
    console.log(`📊 Resized to: ${resizedSizeInMB.toFixed(2)}MB (512x512)`);

    let finalBuffer = resizedBuffer;

    // Get image dimensions for mask creation
    const metadata = await sharp(finalBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // Generate a white mask (allows changes everywhere)
    // This tells OpenAI to generate a completely new scene using the reference photo as style guide
    console.log(`🎭 Generating white mask (${width}x${height})...`);
    const maskBuffer = await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }  // White = edit everywhere
      }
    })
    .toFormat('png')
    .toBuffer();

    // Save both image and mask
    const imageFile = saveAsTempFile(finalBuffer, 'png', 'image');
    const maskFile = saveAsTempFile(maskBuffer, 'png', 'mask');

    console.log(`✅ Image and mask ready`);

    return {
      image: imageFile,
      mask: maskFile
    };

  } catch (error) {
    console.error('❌ Failed to download image:', error);
    throw error;
  }
}

/**
 * Save buffer as temp file and return file object
 */
function saveAsTempFile(buffer: Buffer, format: string, type: 'image' | 'mask' = 'image'): { name: string; path: string; mimeType: string; data: Uint8Array } {
  const tempDir = tmpdir();
  const fileName = `temp-${type}-${Date.now()}.${format}`;
  const filePath = path.join(tempDir, fileName);

  // Write file to disk
  fs.writeFileSync(filePath, buffer);

  const sizeInMB = buffer.length / (1024 * 1024);
  console.log(`✅ ${type} saved (${sizeInMB.toFixed(2)}MB, ${format.toUpperCase()}) to: ${filePath}`);

  // Return file object compatible with FormData
  return {
    data: new Uint8Array(buffer),
    name: fileName,
    path: filePath,
    mimeType: `image/${format}`
  };
}

/**
 * Clean up temporary file
 */
export function cleanupTempFile(fileObj: { path: string }): void {
  const filePath = fileObj.path;
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Cleaned up temp file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to clean up temp file: ${filePath}`, error);
    }
  }
}
