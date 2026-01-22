/**
 * Replicate Face-to-Image Service
 * Uses Replicate API to generate images with user's face
 *
 * Face-to-image models on Replicate:
 * - PhotoMaker: https://replicate.com/tencentarc/photomaker
 * - InstantID: https://replicate.com/lucataco/instantid (may not be available)
 */

class ReplicateFaceIdService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.REPLICATE_API_KEY || '';
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
  }

  /**
   * Generate image with user's face using PhotoMaker
   * PhotoMaker: https://replicate.com/tencentarc/photomaker
   *
   * @param faceImageUrl - URL of user's face image
   * @param prompt - Description of the scene to generate
   * @returns URL of generated image
   */
  async generateImageWithFace(faceImageUrl: string, prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    // PhotoMaker requires "img" as the trigger word in the prompt
    // Format the prompt to include the trigger word and emphasize face accuracy
    const photoMakerPrompt = `${prompt.replace(/\.$/, '')} img`;

    console.log('🎭 Generating image with PhotoMaker (Replicate)...');
    console.log(`📝 Prompt: ${photoMakerPrompt.substring(0, 100)}...`);
    console.log(`👤 Face image: ${faceImageUrl.substring(0, 50)}...`);

    try {
      // Using PhotoMaker with optimized parameters for better face similarity
      const createResponse = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // PhotoMaker version from Replicate API
          version: 'ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4',
          input: {
            input_image: faceImageUrl,
            prompt: photoMakerPrompt,
            negative_prompt: 'nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, different person, altered face',
            // Higher quality settings for better face accuracy
            num_steps: 30,           // Increased from 20 for better detail
            guidance_scale: 7.5,      // Increased from 5 for better prompt adherence
            style_strength_ratio: 15  // Decreased from 20 for better face accuracy (15=minimum, most accurate)
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`❌ Replicate API error: ${createResponse.status}`);
        console.error(`Response: ${errorText}`);
        throw new Error(`Replicate API error: ${createResponse.status}`);
      }

      const prediction = await createResponse.json() as any;
      const predictionUrl = prediction.urls.get;

      console.log(`⏳ Prediction created: ${prediction.id}`);

      // Poll for result
      const result = await this.pollForResult(predictionUrl);

      // PhotoMaker returns a single image URL
      const outputUrl = typeof result.output === 'string' ? result.output : (Array.isArray(result.output) ? result.output[0] : result.output);

      console.log(`✅ PhotoMaker image generated: ${outputUrl.substring(0, 60)}...`);
      return outputUrl;

    } catch (error) {
      console.error('❌ Failed to generate image with PhotoMaker:', error);
      throw error;
    }
  }

  /**
   * Poll for prediction result
   */
  private async pollForResult(url: string, maxAttempts = 120): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to poll result: ${response.status}`);
      }

      const result = await response.json() as any;

      if (result.status === 'succeeded') {
        console.log(`✅ Prediction succeeded after ${i * 2}s`);
        return result;
      } else if (result.status === 'failed' || result.status === 'canceled') {
        throw new Error(`Prediction ${result.status}: ${result.error || 'Unknown error'}`);
      }

      if (i % 10 === 0) {
        console.log(`⏳ Prediction status: ${result.status} (${i * 2}s elapsed)`);
      }
    }

    throw new Error('Prediction timed out after 2 minutes');
  }
}

export const replicateFaceIdService = new ReplicateFaceIdService();
