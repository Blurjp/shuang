import { User } from '../models/database';

export interface GeneratedContent {
  text: string;
  imagePrompt: string;
}

export class ContentGenerator {
  private llmApiKey: string;
  private llmApiUrl: string;
  private imageApiKey: string;
  private imageApiUrl: string;

  constructor() {
    // Read from env at runtime, not at instantiation
    this.llmApiKey = process.env.LLM_API_KEY || '';
    this.llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.imageApiKey = process.env.IMAGE_API_KEY || '';
    this.imageApiUrl = process.env.IMAGE_API_URL || '';
  }

  // Helper method to refresh env vars (call this if env changes)
  private reloadEnv() {
    this.llmApiKey = process.env.LLM_API_KEY || '';
    this.llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.imageApiKey = process.env.IMAGE_API_KEY || '';
    this.imageApiUrl = process.env.IMAGE_API_URL || '';
  }

  /**
   * Generate story text using LLM
   */
  async generateStory(user: User): Promise<string> {
    // Reload environment variables to ensure we have the latest values
    this.reloadEnv();

    const prompt = this.buildPrompt(user);

    // Debug: Log API key status
    const hasKey = this.llmApiKey && this.llmApiKey.length > 10;
    console.log(`🔑 API Key configured: ${hasKey} (length: ${this.llmApiKey?.length || 0})`);

    try {
      const response = await fetch(this.llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.llmApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // More widely available
          messages: [
            {
              role: 'system',
              content: '你是一个爽文作家，擅长创作代入感强的短篇爽文片段。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LLM API error: ${response.status} ${response.statusText}`);
        console.error(`Response body: ${errorText}`);
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const text = data.choices[0].message.content.trim();

      // Validate length
      if (text.length < 80 || text.length > 500) {
        console.warn(`Generated text length ${text.length} is outside target range`);
      }

      console.log(`✅ Story generated successfully: ${text.substring(0, 50)}...`);
      return text;
    } catch (error) {
      console.error('Failed to generate story:', error);
      // Return a fallback story
      return this.generateFallbackStory(user);
    }
  }

  /**
   * Build the prompt based on user preferences
   */
  private buildPrompt(user: User): string {
    const genderMap: Record<string, string> = {
      male: '男性',
      female: '女性'
    };

    const genreMap: Record<string, string> = {
      modern: '现代都市',
      ancient: '古代言情',
      fantasy: '玄幻修仙',
      urban: '都市异能',
      business: '商业商战'
    };

    const emotionMap: Record<string, string> = {
      favored: '被偏爱/宠溺',
      revenge: '冷静反杀/打脸',
      satisfaction: '暗爽/逆袭',
      growth: '成长/奋斗'
    };

    const genderKey = user.gender || 'male';
    const genreKey = user.genre_preference || 'modern';
    const emotionKey = user.emotion_preference || 'satisfaction';

    const gender = genderMap[genderKey] || genderMap['male'];
    const genre = genreMap[genreKey] || genreMap['modern'];
    const emotion = emotionMap[emotionKey] || emotionMap['satisfaction'];

    return `请创作一段80-150字的爽文片段，要求：

1. 第二人称"你"，让读者成为主角
2. 主角性别：${gender}
3. 题材风格：${genre}
4. 情绪基调：${emotion}
5. 开头即高潮，无需铺垫
6. 强代入感，让读者身临其境
7. 用词精炼，节奏明快

请直接输出故事内容，不要加标题或引言。`;
  }

  /**
   * Generate fallback story when API fails
   */
  private generateFallbackStory(user: User): string {
    const templates = [
      "清晨的第一缕阳光透过落地窗，你缓缓睁开双眼，发现自己竟躺在奢华的总裁办公室真皮沙发上。那个曾经看不起你的前辈，此刻正恭敬地站在门口等待你的指示。你嘴角微微上扬，这一切才刚刚开始。",
      "会议室的门被推开，所有人屏息以待。你从容地走进去，将那份价值十亿的合同放在桌上。曾经质疑你的声音此刻全部消失，取而代之的是敬佩的眼神。你知道，用实力说话永远是最好的方式。",
      "夜幕降临，城市的霓虹灯在你脚下闪烁。你站在顶层公寓的落地窗前，回想一路走来的艰辛。那些曾经的嘲笑和质疑，如今都成了你成功的注脚。你轻轻举起酒杯，敬自己，也敬这个属于你的时代。",
      "当那个熟悉的名字出现在获奖名单上时，全场爆发出雷鸣般的掌声。你优雅地走上舞台，接过奖杯的那一刻，闪光灯此起彼伏。你知道，这不仅是对你才华的认可，更是对所有坚持梦想的人的鼓舞。",
      "你推开门的瞬间，整个房间安静了下来。那些曾经看不起你的人，此刻都用仰慕的眼神看着你。你微微一笑，什么都没说，但你的出现本身就是最好的证明。成功的路上没有捷径，但你做到了。"
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate image URL using OpenAI DALL-E
   */
  async generateImage(storyText: string, user: User, userPhotoUrl?: string): Promise<string> {
    // Reload environment variables
    this.reloadEnv();

    // Extract key elements from story for image prompt
    const imagePrompt = this.buildImagePrompt(storyText, user);

    console.log(`🎨 Generating image with DALL-E...`);
    console.log(`📝 Image prompt: ${imagePrompt.substring(0, 100)}...`);
    console.log(`📸 User photo available: ${userPhotoUrl ? 'YES' : 'NO'}`);

    // Check if image API key is configured
    const hasImageKey = this.imageApiKey && this.imageApiKey.length > 10;
    if (!hasImageKey) {
      console.warn(`⚠️  Image API key not configured, using placeholder`);
      return this.getPlaceholderImage(user);
    }

    // Use OpenAI DALL-E to generate image
    try {
      const requestBody = {
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024' as const,
        quality: 'standard' as const,
        style: 'vivid' as const
      };

      console.log(`🔄 Calling DALL-E API...`);

      const response = await fetch(this.imageApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.imageApiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DALL-E API error: ${response.status} ${response.statusText}`);
        console.error(`Response: ${errorText}`);
        throw new Error(`DALL-E API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const imageUrl = data.data[0].url;

      console.log(`✅ Image generated successfully: ${imageUrl.substring(0, 60)}...`);
      return imageUrl;
    } catch (error) {
      console.error('❌ Failed to generate image with DALL-E:', error);
      console.log(`📦 Using placeholder image instead`);
      return this.getPlaceholderImage(user);
    }
  }

  /**
   * Get placeholder image URL as fallback
   */
  private getPlaceholderImage(user: User): string {
    const gender = user.gender === 'male' ? 'male' : 'female';
    const genre = user.genre_preference || 'modern';
    return `https://placehold.co/600x800/1a1a2e/eeaeee?text=${encodeURIComponent(`Daily+Story+${gender}+${genre}`)}`;
  }

  /*
  // Future: If user photo is available, we could use image-to-image generation
  // This would require a different API or service that supports img2img
  if (userPhotoUrl) {
    console.log(`💡 User photo provided, but DALL-E doesn't support image-to-image yet`);
    console.log(`💡 In the future, we could use a service like Stability AI for this`);
    // For now, we'll still generate a new image with DALL-E
  }
  */

  /**
   * Build image prompt from story text and user preferences
   */
  private buildImagePrompt(storyText: string, user: User): string {
    const gender = user.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const genreKey = user.genre_preference || 'modern';

    const styleMap: Record<string, string> = {
      modern: 'modern professional',
      ancient: 'ancient chinese historical',
      fantasy: 'fantasy magical',
      urban: 'urban city',
      business: 'business executive'
    };

    const style = styleMap[genreKey] || 'modern professional';

    // Build a detailed prompt based on the story
    return `A ${style} portrait of a ${gender}, in a success moment, cinematic lighting, high quality, detailed, 8k resolution, professional photography, vibrant colors`;
  }
}

export const contentGenerator = new ContentGenerator();
