/**
 * Cloudflare Worker for Daily Protagonist Image Generation
 * Simplified version without KV - for initial deployment
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route: POST /v1/daily-image
    if (path === '/v1/daily-image' && request.method === 'POST') {
      return handleDailyImage(request, env);
    }

    // Route: GET /health
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Handle daily image generation request
 */
async function handleDailyImage(request, env) {
  try {
    // Parse request body
    const body = await request.json();
    const { user_id, story_text, face_base64 } = body;

    // Validate required fields
    if (!user_id || !story_text) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: user_id and story_text are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    console.log(`Generating image for ${user_id} on ${today}`);

    // Generate image using AI API
    const imageResult = await generateImage(story_text, face_base64, env);

    console.log(`Generated new image for ${user_id} on ${today}`);

    return new Response(JSON.stringify({
      date: today,
      cached: false,
      image_base64: imageResult.image_base64,
      prompt_used: imageResult.prompt_used
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error in handleDailyImage:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Generate image using AI API
 *
 * PRIORITY ORDER (when face photo is available):
 * 1. Replicate FaceID - Best for face-to-image (uses user's actual face)
 * 2. Stability AI img2img - Alternative for face-to-image
 * 3. OpenAI DALL-E - Text-to-image only (no face integration)
 */
async function generateImage(storyText, faceBase64, env) {
  const hasFacePhoto = faceBase64 && faceBase64.length > 0;

  // ============================================
  // OPTION 1: Replicate FaceID (BEST for face-to-image)
  // Uses IP-Adapter-FaceID to integrate user's face into generated image
  // ============================================
  if (env.REPLICATE_API_KEY && hasFacePhoto) {
    console.log(`✨ Using Replicate IP-Adapter-FaceID (face-to-image)`);
    return await generateWithReplicateFaceID(storyText, faceBase64, env);
  }

  // ============================================
  // OPTION 2: OpenAI DALL-E (Text-to-image only)
  // Does NOT support face-to-image, generates generic illustrations
  // ============================================
  if (env.OPENAI_API_KEY) {
    console.log(`🎨 Using OpenAI DALL-E (text-to-image)`);
    if (hasFacePhoto) {
      console.log(`⚠️  WARNING: DALL-E does not support face-to-image. User's face will NOT be used.`);
    }
    return await generateWithDALLE(storyText, faceBase64, env);
  }

  // ============================================
  // OPTION 3: Stability AI (Text-to-image only)
  // ============================================
  if (env.STABILITY_API_KEY) {
    console.log(`🖼️  Using Stability AI SDXL (text-to-image)`);
    if (hasFacePhoto) {
      console.log(`⚠️  WARNING: Current Stability AI implementation does not use face photo.`);
    }
    return await generateWithStabilityAI(storyText, faceBase64, env);
  }

  // ============================================
  // OPTION 4: Replicate SDXL (Fallback when no face photo)
  // ============================================
  if (env.REPLICATE_API_KEY) {
    console.log(`🖼️  Using Replicate SDXL (text-to-image)`);
    return await generateWithReplicate(storyText, faceBase64, env);
  }

  // No API key configured - return mock response for testing
  console.log(`⚠️  No API key configured, returning mock image`);
  return {
    image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
    prompt_used: { model: 'mock', prompt: storyText.substring(0, 100) }
  };
}

/**
 * Generate image using OpenAI DALL-E
 */
async function generateWithDALLE(storyText, faceBase64, env) {
  const prompt = `A cinematic illustration for a story: ${storyText.substring(0, 500)}. Style: Warm, artistic, storytelling illustration.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const imageBase64 = data.data[0].b64_json;

  return {
    image_base64: `data:image/png;base64,${imageBase64}`,
    prompt_used: { model: 'dall-e-3', prompt: prompt }
  };
}

/**
 * Generate image using Stability AI (Stable Diffusion)
 * Supports both text-to-image and image-to-image
 */
async function generateWithStabilityAI(storyText, faceBase64, env) {
  const hasFacePhoto = faceBase64 && faceBase64.length > 0;

  // Build prompt from story
  const prompt = `A cinematic illustration for a story: ${storyText.substring(0, 500)}. Style: Warm, artistic, storytelling illustration.`;
  const negativePrompt = 'monochrome, lowres, bad anatomy, worst quality, low quality, blurry, distorted, ugly';

  const formData = new FormData();
  formData.append('text_prompts[0][text]', prompt);
  formData.append('text_prompts[0][weight]', '1');
  formData.append('text_prompts[1][text]', negativePrompt);
  formData.append('text_prompts[1][weight]', '-1');
  formData.append('cfg_scale', '7');
  formData.append('height', '1024');
  formData.append('width', '1024');
  formData.append('samples', '1');
  formData.append('steps', '30');

  let endpoint = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

  // If face photo is available, use image-to-image endpoint
  if (hasFacePhoto) {
    console.log(`📸 Using Stability AI image-to-image with face photo`);
    endpoint = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image';

    // Convert base64 to binary
    const base64Data = faceBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([imageBuffer], { type: 'image/png' });

    formData.append('init_image', blob);
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.35'); // Lower = more influence from init image
  } else {
    console.log(`📝 Using Stability AI text-to-image (no face photo)`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STABILITY_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stability AI error: ${error}`);
  }

  const data = await response.json();
  const imageBase64 = data.artifacts[0].base64;

  return {
    image_base64: `data:image/png;base64,${imageBase64}`,
    prompt_used: {
      model: hasFacePhoto ? 'stable-diffusion-xl-img2img' : 'stable-diffusion-xl',
      prompt: prompt,
      has_face_photo: hasFacePhoto
    }
  };
}

/**
 * Generate image using Replicate with FaceID (uses user's face photo)
 * This is the RECOMMENDED method when user face photo is available
 */
async function generateWithReplicateFaceID(storyText, faceBase64, env) {
  // Build a prompt based on the story text
  const prompt = buildPromptFromStory(storyText);

  console.log(`🎭 Using IP-Adapter-FaceID model with user's face photo`);
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

  // Prepare the input for IP-Adapter-FaceID
  const input = {
    face: faceBase64,
    prompt: prompt,
    negative_prompt: 'monochrome, lowres, bad anatomy, worst quality, low quality, blurry, distorted, ugly, duplicate',
    num_outputs: 1,
    width: 1024,
    height: 1024,
    guidance_scale: 7.5,
    num_inference_steps: 30,
    scheduler: 'DPMSolverMultistep'
  };

  // Start prediction
  const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // IP-Adapter-FaceID model version
      version: 'lucataco/ip-adapter-faceid:fb81ef963e74776af72e6f380949013533d46dd5c6228a9e586c57db6303d7cd',
      input: input
    })
  });

  if (!startResponse.ok) {
    const error = await startResponse.text();
    throw new Error(`Replicate FaceID error: ${error}`);
  }

  let prediction = await startResponse.json();
  console.log(`🔄 Prediction started: ${prediction.urls.get}`);

  // Poll for result
  let attempts = 0;
  const maxAttempts = 120; // 2 minutes max
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    if (attempts >= maxAttempts) {
      throw new Error('Replicate prediction timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        'Authorization': `Token ${env.REPLICATE_API_KEY}`
      }
    });
    prediction = await pollResponse.json();
    attempts++;
    console.log(`⏳ Polling... (${attempts}/${maxAttempts})`);
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate FaceID prediction failed: ${prediction.error}`);
  }

  // Fetch image from output URL
  const imageResponse = await fetch(prediction.output[0]);
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  console.log(`✅ Image generated with FaceID successfully`);

  return {
    image_base64: `data:image/png;base64,${imageBase64}`,
    prompt_used: { model: 'ip-adapter-faceid', prompt: prompt }
  };
}

/**
 * Generate image using Replicate SDXL (fallback when no face photo)
 */
async function generateWithReplicate(storyText, faceBase64, env) {
  const prompt = `A cinematic illustration for a story: ${storyText.substring(0, 500)}. Style: Warm, artistic, storytelling illustration.`;

  // Start prediction
  const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea5705e8b9d44e432370835cd',
      input: {
        prompt: prompt,
        width: 1024,
        height: 1024,
        num_outputs: 1
      }
    })
  });

  if (!startResponse.ok) {
    const error = await startResponse.text();
    throw new Error(`Replicate error: ${error}`);
  }

  let prediction = await startResponse.json();

  // Poll for result
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: {
        'Authorization': `Token ${env.REPLICATE_API_KEY}`
      }
    });
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  // Fetch image
  const imageResponse = await fetch(prediction.output[0]);
  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  return {
    image_base64: `data:image/png;base64,${imageBase64}`,
    prompt_used: { model: 'sdxl', prompt: prompt }
  };
}

/**
 * Build a visual prompt from the story text
 */
function buildPromptFromStory(storyText) {
  // Extract key elements from the story to build a visual prompt
  const text = storyText.substring(0, 300);

  // Keywords that indicate different styles/scenes
  const styleKeywords = {
    modern: 'modern professional, city background, business attire, confident',
    ancient: 'ancient chinese historical, traditional clothing, palace or garden, elegant',
    fantasy: 'fantasy magical, cultivation scene, ethereal glow, mystical atmosphere',
    urban: 'urban city, contemporary setting, dynamic lighting, cinematic',
    business: 'business executive, office setting, professional, successful'
  };

  // Detect genre from story text
  let style = styleKeywords.modern;
  for (const [genre, prompt] of Object.entries(styleKeywords)) {
    if (text.includes(genre === 'modern' ? '公司' : genre === 'ancient' ? '古代' : genre === 'fantasy' ? '修仙' : genre === 'urban' ? '异能' : '商业')) {
      style = prompt;
      break;
    }
  }

  // Build the final prompt
  return `A portrait photo of a person in a success moment, ${style}, cinematic lighting, high quality, detailed, 8k resolution, professional photography, vibrant colors, storytelling scene`;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
