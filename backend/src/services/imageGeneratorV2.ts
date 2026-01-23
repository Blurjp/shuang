/**
 * Image Generator V2 - Multi-Provider Image Generation Service
 *
 * Strategy: Replicate PhotoMaker (primary) → OpenAI gpt-image-1 (fallback)
 * PhotoMaker provides better face consistency than OpenAI's Image Edit API
 *
 * Features:
 * - Automatic fallback between providers
 * - Retry logic for transient errors
 * - Metrics tracking for provider usage
 * - Cost optimization monitoring
 */

import Replicate from 'replicate';
import { Scene, buildImagePromptWithIdentityLock } from './sceneGenerator';
import { openaiImageEditService } from './openaiImageEdit';
import { uploadPhoto } from './storage';
import fs from 'fs';

// ============================================
// Type Definitions
// ============================================

export interface ImageGenerationParams {
  userPhotoUrl: string;       // User's reference photo URL
  scene: Scene;               // Scene configuration
  gender: 'male' | 'female';  // User gender
}

export interface ImageGenerationResult {
  imageUrl: string;
  provider: 'replicate' | 'openai';
  generationTimeMs: number;
  costEstimate?: number;      // Estimated cost in USD
}

interface ProviderMetrics {
  provider: string;
  successCount: number;
  failureCount: number;
  totalCost: number;
  avgGenerationTime: number;
}

// ============================================
// Configuration
// ============================================

const CONFIG = {
  // Replicate PhotoMaker configuration
  replicate: {
    // Use specific version hash for tencentarc/photomaker
    model: 'tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4',
    numSteps: 50,              // PhotoMaker recommends 50 steps
    styleStrengthRatio: 20,    // 20-40 keeps more original appearance
    guidanceScale: 7.5,
    timeout: 300000,           // 5 minutes timeout (PhotoMaker can be slower)
  },

  // OpenAI fallback configuration
  openai: {
    model: 'gpt-image-1',
    size: '512x512',
  },

  // Retry configuration
  retry: {
    maxAttempts: 2,
    delayMs: 1000,
  },

  // Cost estimates (per image)
  costs: {
    replicate: 0.025,    // ~$0.025 per PhotoMaker image
    openai: 0.04,        // ~$0.04 per gpt-image-1 image (512x512)
  }
};

// ============================================
// Metrics Tracking
// ============================================

const metricsStore = new Map<string, ProviderMetrics>();

function recordMetrics(
  provider: string,
  success: boolean,
  duration: number,
  cost: number = 0
) {
  const key = provider;
  const existing = metricsStore.get(key) || {
    provider: key,
    successCount: 0,
    failureCount: 0,
    totalCost: 0,
    avgGenerationTime: 0,
  };

  if (success) {
    existing.successCount++;
    existing.totalCost += cost;
    // Update average: new_avg = (old_avg * n + new_value) / (n + 1)
    const totalCount = existing.successCount + existing.failureCount;
    existing.avgGenerationTime =
      (existing.avgGenerationTime * (totalCount - 1) + duration) / totalCount;
  } else {
    existing.failureCount++;
  }

  metricsStore.set(key, existing);
  console.log(`📊 Metrics [${provider}]:`, JSON.stringify(existing, null, 2));
}

export function getMetrics(): ProviderMetrics[] {
  return Array.from(metricsStore.values());
}

// ============================================
// Main Entry Point: Multi-Provider Image Generation
// ============================================

/**
 * Generate personalized image with automatic provider fallback
 *
 * @param params - Image generation parameters
 * @returns Generated image URL with provider info
 */
export async function generatePersonalizedImage(
  params: ImageGenerationParams
): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  console.log('🎨 Starting image generation V2...');
  console.log(`📸 Reference photo: ${params.userPhotoUrl.substring(0, 50)}...`);
  console.log(`🎭 Scene: ${params.scene.description}`);
  console.log(`👤 Gender: ${params.gender}`);

  // Strategy 1: Try Replicate PhotoMaker (better face consistency)
  for (let attempt = 1; attempt <= CONFIG.retry.maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${CONFIG.retry.maxAttempts} with Replicate PhotoMaker...`);
      const result = await generateWithReplicate(params);
      const duration = Date.now() - startTime;
      recordMetrics('replicate', true, duration, CONFIG.costs.replicate);

      return {
        imageUrl: result,
        provider: 'replicate',
        generationTimeMs: duration,
        costEstimate: CONFIG.costs.replicate,
      };
    } catch (error) {
      const isLastAttempt = attempt === CONFIG.retry.maxAttempts;
      console.warn(`⚠️  Replicate attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

      if (!isLastAttempt) {
        console.log(`⏳ Waiting ${CONFIG.retry.delayMs}ms before retry...`);
        await sleep(CONFIG.retry.delayMs * attempt); // Exponential backoff
        continue;
      }

      recordMetrics('replicate', false, Date.now() - startTime);
    }
  }

  // Strategy 2: Fallback to OpenAI gpt-image-1
  console.log('🔄 Replicate failed, falling back to OpenAI gpt-image-1...');
  try {
    const result = await openaiImageEditService.generateImageWithIdentity(
      params.userPhotoUrl,
      params.scene,
      params.gender
    );
    const duration = Date.now() - startTime;
    recordMetrics('openai', true, duration, CONFIG.costs.openai);

    return {
      imageUrl: result,
      provider: 'openai',
      generationTimeMs: duration,
      costEstimate: CONFIG.costs.openai,
    };
  } catch (error) {
    recordMetrics('openai', false, Date.now() - startTime);
    console.error('❌ All providers failed. Last error:', error);
    throw new Error(
      `Image generation failed. Replicate error: ${error instanceof Error ? error.message : 'Unknown'}`
    );
  }
}

// ============================================
// Replicate PhotoMaker Implementation
// ============================================

async function generateWithReplicate(
  params: ImageGenerationParams
): Promise<string> {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    throw new Error('REPLICATE_API_KEY not configured');
  }

  const replicate = new Replicate({ auth: apiKey });

  // Build prompt for PhotoMaker
  const prompt = buildPhotoMakerPrompt(params.scene, params.gender);
  const negativePrompt = buildNegativePrompt();

  console.log(`📝 PhotoMaker prompt: ${prompt.substring(0, 150)}...`);
  console.log(`📝 Negative prompt: ${negativePrompt.substring(0, 100)}...`);

  // Download user photo for upload
  console.log('⬇️  Downloading user photo for PhotoMaker...');
  const imageBuffer = await downloadImageAsBuffer(params.userPhotoUrl);
  const base64Image = imageBuffer.toString('base64');

  console.log('🔄 Calling Replicate PhotoMaker API...');

  // Call Replicate with timeout
  // PhotoMaker uses specific parameter names
  const output = await withTimeout(
    replicate.run(CONFIG.replicate.model as any, {
      input: {
        input_image: `data:image/jpeg;base64,${base64Image}`,
        prompt: prompt,
        negative_prompt: negativePrompt,
        num_steps: CONFIG.replicate.numSteps,
        style_strength_ratio: CONFIG.replicate.styleStrengthRatio,
        guidance_scale: CONFIG.replicate.guidanceScale,
        num_outputs: 1,
      },
    }),
    CONFIG.replicate.timeout
  ) as any;

  // Debug: Log output structure
  console.log('📦 Replicate output type:', typeof output);
  console.log('📦 Is array:', Array.isArray(output));
  if (Array.isArray(output)) {
    console.log('📦 Array length:', output.length);
    console.log('📦 First item type:', typeof output[0]);
    const item = output[0];
    console.log('📦 Has .url:', 'url' in item);
    console.log('📦 .url type:', typeof item.url);
    console.log('📦 .url value:', item.url);
  }

  // PhotoMaker returns an array of objects with .url (function) and .read() (method)
  // Format: [{url: () => URL | string, read(): () toBuffer()}]
  let imageUrl: string;
  if (Array.isArray(output) && output.length > 0) {
    // First item in array
    const item = output[0];
    // Check if it's an object with url property
    if (item && typeof item === 'object' && 'url' in item) {
      // item.url might be a function or a string
      const urlProperty = (item as any).url;
      if (typeof urlProperty === 'function') {
        // Call the function to get the URL
        const urlResult = urlProperty();
        // Convert URL object or string to string
        imageUrl = urlResult.toString();
      } else if (typeof urlProperty === 'string') {
        imageUrl = urlProperty;
      } else {
        throw new Error(`Unexpected .url type: ${typeof urlProperty}`);
      }
    } else if (typeof item === 'string') {
      imageUrl = item;
    } else {
      throw new Error(`Unexpected output format: ${JSON.stringify(output).substring(0, 200)}`);
    }
  } else if (typeof output === 'string') {
    imageUrl = output;
  } else if (output?.output) {
    // Some Replicate models wrap output in an object
    imageUrl = Array.isArray(output.output) ? output.output[0] : output.output;
  } else {
    throw new Error(`Unexpected output format from Replicate: ${JSON.stringify(output).substring(0, 200)}`);
  }

  console.log(`✅ PhotoMaker generated image: ${imageUrl.substring(0, 60)}...`);

  // Download from Replicate and upload to Cloudinary for consistent hosting
  console.log('☁️  Uploading to Cloudinary...');
  const replicatedImageBuffer = await downloadImageAsBuffer(imageUrl);
  const cloudinaryUrl = await uploadPhoto(
    replicatedImageBuffer,
    'image/png',
    'system',
    `photomaker-${Date.now()}.png`
  );

  console.log(`✅ Image uploaded to Cloudinary: ${cloudinaryUrl.substring(0, 60)}...`);
  return cloudinaryUrl;
}

// ============================================
// Prompt Builders for PhotoMaker
// ============================================

/**
 * Build prompt optimized for PhotoMaker model
 * PhotoMaker requires "img" trigger word in the prompt
 */
function buildPhotoMakerPrompt(scene: Scene, gender: 'male' | 'female'): string {
  const genderTerm = gender === 'male' ? 'man' : 'woman';

  // PhotoMaker-specific prompt structure with "img" trigger word
  // The "img" keyword tells PhotoMaker where to place the face
  const identitySection = `A photo of a ${genderTerm} img with the exact same face as the reference image.`;

  const sceneSection = `
${scene.description}

Setting: ${scene.environment}
Action: ${scene.camera.action || 'standing confidently'}
Camera: ${scene.camera.shot}, ${scene.camera.angle}, ${scene.camera.distance}
Lighting: ${scene.lighting.type} - ${scene.lighting.quality}
Mood: ${scene.emotion} expression, ${scene.atmosphere}
`.trim();

  const qualitySection = `
Professional photography, high quality, detailed, realistic.
DSLR camera, sharp focus on face, natural skin texture, cinematic lighting.
Ultra realistic, not AI-generated looking, photorealistic.
`.trim();

  return `${identitySection}\n\n${sceneSection}\n\n${qualitySection}`;
}

/**
 * Build negative prompt to avoid common issues
 */
function buildNegativePrompt(): string {
  return `
ugly, deformed, noisy, blurry, low contrast,
cartoon, anime, illustration, painting, drawing,
face distortion, wrong face, different person, changed face,
extra fingers, extra limbs, missing limbs,
plastic skin, over-smoothed skin, wax skin,
beautified face, idealized face, model face,
low resolution, watermark, text, signature,
bad anatomy, bad proportions, disconnected limbs,
mutation, mutated, floating limbs, disfigured
`.trim().replace(/\s+/g, ' ');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Download image from URL as Buffer
 */
async function downloadImageAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add timeout to any promise
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// ============================================
// Admin/Analytics Functions
// ============================================

/**
 * Get daily cost summary
 */
export function getDailyCostSummary(): {
  totalCost: number;
  totalImages: number;
  byProvider: Record<string, { count: number; cost: number; avgTime: number }>;
} {
  const summary = {
    totalCost: 0,
    totalImages: 0,
    byProvider: {} as Record<string, { count: number; cost: number; avgTime: number }>,
  };

  for (const [provider, metrics] of metricsStore.entries()) {
    const count = metrics.successCount;
    const cost = metrics.totalCost;

    summary.totalCost += cost;
    summary.totalImages += count;
    summary.byProvider[provider] = {
      count,
      cost,
      avgTime: metrics.avgGenerationTime,
    };
  }

  return summary;
}

/**
 * Check if daily budget is exceeded
 */
export function checkBudgetAlert(dailyBudget: number): {
  exceeded: boolean;
  currentCost: number;
  remaining: number;
  percentage: number;
} {
  const summary = getDailyCostSummary();
  const currentCost = summary.totalCost;
  const percentage = (currentCost / dailyBudget) * 100;

  return {
    exceeded: currentCost > dailyBudget,
    currentCost,
    remaining: Math.max(0, dailyBudget - currentCost),
    percentage,
  };
}

// ============================================
// Export singleton instance for easy use
// ============================================

export const imageGeneratorV2 = {
  generatePersonalizedImage,
  getMetrics,
  getDailyCostSummary,
  checkBudgetAlert,
};
