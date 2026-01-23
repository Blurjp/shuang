/**
 * OpenAI Image Edit Service
 * Uses OpenAI's Image Edit API with reference image for identity preservation
 * Endpoint: POST /v1/images/edits
 * Model: gpt-image-1 (with dall-e-2 fallback)
 */

import { Scene, buildImagePromptWithIdentityLock } from './sceneGenerator';
import { downloadImageAsFile, cleanupTempFile } from '../utils/imageDownloader';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

class OpenAIImageEditService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.IMAGE_API_KEY || '';
    this.apiUrl = 'https://api.openai.com/v1/images/edits';
  }

  /**
   * Generate image using OpenAI's Image Edit API with reference image
   * This preserves the user's identity while applying the scene
   *
   * @param userPhotoUrl - URL to user's reference photo
   * @param scene - The scene to render
   * @param userGender - User's gender for prompt
   * @returns URL of generated image
   */
  async generateImageWithIdentity(
    userPhotoUrl: string,
    scene: Scene,
    userGender: 'male' | 'female'
  ): Promise<string> {
    // Reload API key at call time to support dotenv.config() in tests
    this.apiKey = process.env.IMAGE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('IMAGE_API_KEY not configured');
    }

    console.log('🖼️  Generating image with OpenAI Image Edit API...');
    console.log(`📸 Reference photo: ${userPhotoUrl.substring(0, 60)}...`);
    console.log(`🎭 Scene: ${scene.description}`);
    console.log(`📐 Camera: ${scene.camera.shot}, ${scene.camera.angle}`);

    try {
      // Download the reference image and generate mask
      console.log('⬇️  Downloading reference image and generating mask...');
      const { image, mask } = await downloadImageAsFile(userPhotoUrl);

      // Build the prompt with identity lock
      const prompt = buildImagePromptWithIdentityLock(scene, userGender);
      console.log(`📝 Prompt: ${prompt.substring(0, 150)}...`);

      // Read file buffers
      const imageBuffer = fs.readFileSync(image.path);
      const maskBuffer = fs.readFileSync(mask.path);

      // Create FormData using form-data package
      const formData = new FormData();

      // Append buffers directly (not streams)
      formData.append('image', imageBuffer, {
        filename: image.name,
        contentType: image.mimeType
      });

      // Append mask buffer (white mask = edit everything, generate new scene)
      formData.append('mask', maskBuffer, {
        filename: mask.name,
        contentType: mask.mimeType
      });

      // Append other parameters
      formData.append('prompt', prompt);
      formData.append('model', 'gpt-image-1'); // Use gpt-image-1 for identity preservation
      formData.append('n', '1');
      formData.append('size', '1024x1024'); // gpt-image-1 requires 1024x1024 or larger

      console.log('🔄 Calling OpenAI Image Edit API...');

      // Get form buffer and headers
      const formBuffer = formData.getBuffer();
      const headers = formData.getHeaders();
      headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: headers as any,
        body: formBuffer as any,
      });

      // Clean up temp files
      cleanupTempFile(image as any);
      cleanupTempFile(mask as any);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OpenAI API error: ${response.status}`);
        console.error(`Response: ${errorText || 'No response text'}`);

        // Log specific format errors for debugging
        if (errorText && (errorText.includes('RGBA') || errorText.includes('RGB'))) {
          console.error(`⚠️  Image format issue: OpenAI Image Edit API requires RGBA format with alpha channel`);
          console.error(`⚠️  The downloaded image is RGB format (no alpha channel)`);
        }

        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as any;
      console.log(`📦 API Response structure:`, Object.keys(data.data[0] || 'no data'));

      if (!data.data || !data.data[0]) {
        console.error(`❌ Unexpected response structure from OpenAI API`);
        console.error(`Response data:`, JSON.stringify(data));
        throw new Error(`Unexpected API response structure`);
      }

      // gpt-image-1 returns b64_json, dall-e-2 returns url
      const imageData = data.data[0];
      let imageUrl: string;

      if (imageData.b64_json) {
        // gpt-image-1 returns base64 encoded image
        console.log(`✅ gpt-image-1 returned base64 image (length: ${imageData.b64_json.length})`);

        // Save base64 image to temp file and upload to Cloudinary
        const buffer = Buffer.from(imageData.b64_json, 'base64');
        const tempPath = `/tmp/generated-image-${Date.now()}.png`;
        require('fs').writeFileSync(tempPath, buffer);

        // Upload to Cloudinary to get a URL
        const { uploadPhoto } = require('../services/storage');
        imageUrl = await uploadPhoto(buffer, 'image/png', 'system', 'gpt-image-1-generated.png');

        // Clean up temp file
        require('fs').unlinkSync(tempPath);

        console.log(`✅ Image uploaded to Cloudinary: ${imageUrl.substring(0, 60)}...`);
      } else if (imageData.url) {
        // dall-e-2 returns url directly
        imageUrl = imageData.url;
        console.log(`✅ Image URL returned: ${imageUrl.substring(0, 60)}...`);
      } else {
        console.error(`❌ Unknown response format:`, JSON.stringify(imageData));
        throw new Error(`Unknown API response format`);
      }

      return imageUrl;

    } catch (error) {
      console.error('❌ Failed to generate image with OpenAI Image Edit:', error);
      throw error;
    }
  }

  /**
   * Generate image without reference (fallback using DALL-E)
   */
  async generateImageWithoutIdentity(scene: Scene, userGender: 'male' | 'female'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('IMAGE_API_KEY not configured');
    }

    console.log('🎨 Generating image without reference (DALL-E)...');

    const prompt = buildImagePromptWithIdentityLock(scene, userGender);

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DALL-E API error: ${response.status}`);
        console.error(`Response: ${errorText}`);
        throw new Error(`DALL-E API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const imageUrl = data.data[0].url;

      console.log(`✅ DALL-E image generated: ${imageUrl.substring(0, 60)}...`);
      return imageUrl;

    } catch (error) {
      console.error('❌ Failed to generate image with DALL-E:', error);
      throw error;
    }
  }
}

export const openaiImageEditService = new OpenAIImageEditService();

/**
 * Generate image using dall-e-2 Image Edit API (fallback when gpt-image-1 unavailable)
 */
export async function generateImageWithDalle2(
  userPhotoUrl: string,
  scene: Scene,
  userGender: 'male' | 'female'
): Promise<string> {
  const apiKey = process.env.IMAGE_API_KEY || '';
  const apiUrl = 'https://api.openai.com/v1/images/edits';

  if (!apiKey) {
    throw new Error('IMAGE_API_KEY not configured');
  }

  console.log('🖼️  Generating image with DALL-E 2 Image Edit API...');
  console.log(`📸 Reference photo: ${userPhotoUrl.substring(0, 60)}...`);
  console.log(`🎭 Scene: ${scene.description}`);

  try {
    // Download the reference image and generate mask
    const { image, mask } = await downloadImageAsFile(userPhotoUrl);

    // Build the prompt
    const prompt = buildImagePromptWithIdentityLock(scene, userGender);
    console.log(`📝 Prompt: ${prompt.substring(0, 150)}...`);

    // Read image and mask files
    const imageBuffer = require('fs').readFileSync(image.path);
    const maskBuffer = require('fs').readFileSync(mask.path);

    // Create FormData using form-data package for proper multipart
    const formData = new FormData();
    formData.append('image', fs.readFileSync(image.path), {
      filename: image.name,
      contentType: image.mimeType
    });
    formData.append('mask', fs.readFileSync(mask.path), {
      filename: mask.name,
      contentType: mask.mimeType
    });
    formData.append('prompt', prompt);
    formData.append('model', 'dall-e-2');
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    console.log('🔄 Calling DALL-E 2 Image Edit API...');

    const headers = formData.getHeaders();
    headers['Authorization'] = `Bearer ${apiKey}`;

    // Get buffer from form-data
    const formBuffer = formData.getBuffer();

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers as any,
      body: formBuffer as any,
    });

    // Clean up temp files
    cleanupTempFile(image as any);
    cleanupTempFile(mask as any);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ DALL-E 2 Image Edit error: ${response.status}`);
      console.error(`Response: ${errorText}`);
      throw new Error(`DALL-E 2 Image Edit error: ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    const imageUrl = data.data[0].url;

    console.log(`✅ DALL-E 2 Image Edit generated: ${imageUrl.substring(0, 60)}...`);
    return imageUrl;

  } catch (error) {
    console.error('❌ Failed to generate image with DALL-E 2 Image Edit:', error);
    throw error;
  }
}
