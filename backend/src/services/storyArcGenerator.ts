/**
 * Story Arc Generator V1
 *
 * Generates individual episodes for 30-day story arcs.
 * Uses Claude API for story generation with context from:
 * - Story template (genre, emotion, overall arc)
 * - Previous episodes (for continuity)
 * - Day-specific plot outline
 * - User preferences and character names
 *
 * Combines with imageGeneratorV2 for consistent character images.
 */

import Anthropic from '@anthropic-ai/sdk';
import { westernStoryTemplates, type StoryTemplate, type EpisodeOutline } from './westernStoryTemplates';
import { generatePersonalizedImage } from './imageGeneratorV2';
import type { Scene } from './sceneGenerator';
import type { User, StoryArc, StoryEpisode } from '../models/database';
import { getStoryArcById, getEpisodesByArc, getUserPhotos } from '../models/database';

// ============================================
// Type Definitions
// ============================================

export interface EpisodeGenerationParams {
  storyArcId: string;
  dayNumber: number;
  user: User;
  userName?: string; // User's preferred name (for protagonist)
  loveInterestName?: string; // User's preferred love interest name
}

export interface EpisodeGenerationResult {
  episode: {
    title: string;
    text: string;
    sceneDescription: string;
  };
  imageUrl: string;
  storyProvider: 'claude' | 'openai';
  imageProvider: 'replicate' | 'openai';
  generationTimeMs: number;
}

// ============================================
// Configuration
// ============================================

const CONFIG = {
  claude: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    temperature: 0.8,
  },
  episodeLength: {
    minWords: 150,
    maxWords: 250,
  },
};

// ============================================
// Story Arc Generator
// ============================================

class StoryArcGenerator {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate a single episode for a story arc
   */
  async generateEpisode(params: EpisodeGenerationParams): Promise<EpisodeGenerationResult> {
    const startTime = Date.now();

    // 1. Get the story arc and template
    const arc = await getStoryArcById(params.storyArcId);
    if (!arc) {
      throw new Error(`Story arc ${params.storyArcId} not found`);
    }

    const template = westernStoryTemplates.getTemplate(arc.story_template_id);
    if (!template) {
      throw new Error(`Template ${arc.story_template_id} not found`);
    }

    const episodeOutline = template.episodes.find(e => e.day === params.dayNumber);
    if (!episodeOutline) {
      throw new Error(`Episode outline for day ${params.dayNumber} not found`);
    }

    // 2. Get previous episodes for continuity
    const previousEpisodes = await getEpisodesByArc(params.storyArcId);
    const episodeContext = this.buildEpisodeContext(
      template,
      episodeOutline,
      previousEpisodes,
      params
    );

    // 3. Generate story text with Claude
    const storyResult = await this.generateStoryText(episodeContext);
    const generationTime = Date.now() - startTime;

    // 4. Generate image
    const imageResult = await this.generateEpisodeImage(
      storyResult.sceneDescription,
      template,
      params.dayNumber,
      params.user
    );

    return {
      episode: {
        title: storyResult.title,
        text: storyResult.text,
        sceneDescription: storyResult.sceneDescription,
      },
      imageUrl: imageResult.imageUrl,
      storyProvider: 'claude', // Story generation uses Claude
      imageProvider: imageResult.provider, // Image generation uses Replicate or OpenAI
      generationTimeMs: generationTime,
    };
  }

  /**
   * Build context for episode generation
   */
  private buildEpisodeContext(
    template: StoryTemplate,
    episodeOutline: EpisodeOutline,
    previousEpisodes: StoryEpisode[],
    params: EpisodeGenerationParams
  ): string {
    const protagonistName = params.userName || this.getDefaultProtagonistName(template, params.user.gender);
    const loveInterestName = params.loveInterestName || this.getDefaultLoveInterestName(template, params.user.gender);

    let context = `You are writing Episode ${params.dayNumber} of a 30-day romance story arc.

**STORY OVERVIEW:**
Title: ${template.title}
Genre: ${template.genre}
Theme: ${template.emotion}
Summary: ${template.summary}

**CHARACTERS:**
- Protagonist: ${protagonistName}
- Love Interest: ${loveInterestName}

**TONE & STYLE:**
${template.emotionalTone}

**TODAY'S EPISODE (Day ${params.dayNumber}):**
Plot: ${episodeOutline.plot}
`;

    // Add continuity from previous episodes
    if (previousEpisodes.length > 0) {
      context += `\n**STORY CONTINUITY:**\n`;
      context += `Previous episodes summary:\n`;

      const recentEpisodes = previousEpisodes.slice(-3); // Last 3 episodes for context
      recentEpisodes.forEach(ep => {
        const summary = this.summarizeEpisode(ep.text);
        context += `Day ${ep.episode_number}: ${summary}\n`;
      });

      const lastEpisode = previousEpisodes[previousEpisodes.length - 1];
      context += `\nLast episode ended: ${this.summarizeEpisode(lastEpisode.text, 100)}\n`;
    }

    // Add episode-specific guidance
    if (episodeOutline.keyMoments) {
      context += `\n**KEY MOMENTS TO INCLUDE:**\n`;
      episodeOutline.keyMoments.forEach(moment => {
        context += `- ${moment}\n`;
      });
    }

    return context;
  }

  /**
   * Generate story text using Claude API
   */
  private async generateStoryText(context: string): Promise<{
    title: string;
    text: string;
    sceneDescription: string;
  }> {
    const prompt = `${context}

**REQUIREMENTS:**
1. Write ${CONFIG.episodeLength.minWords}-${CONFIG.episodeLength.maxWords} words
2. Focus on TODAY's plot point only
3. Maintain emotional continuity with previous episodes
4. Include dialogue and sensory details
5. End with a hook/tease for tomorrow (unless Day 30)
6. Write in English with engaging, contemporary prose

**OUTPUT FORMAT:**
TITLE: [Episode title]
STORY: [Your story text]
SCENE_DESCRIPTION: [1-2 sentences describing the visual scene for image generation]`;

    try {
      const response = await this.anthropic.messages.create({
        model: CONFIG.claude.model,
        max_tokens: CONFIG.claude.maxTokens,
        temperature: CONFIG.claude.temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseStoryResponse(content.text);
    } catch (error) {
      console.error('Claude story generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse Claude's response into structured data
   */
  private parseStoryResponse(response: string): {
    title: string;
    text: string;
    sceneDescription: string;
  } {
    let title = 'Episode';
    let text = response;
    let sceneDescription = 'Romantic scene with two people';

    // Extract title
    const titleMatch = response.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      text = response.replace(/TITLE:\s*.+?\n/i, '');
    }

    // Extract scene description
    const sceneMatch = response.match(/SCENE_DESCRIPTION:\s*(.+?)(?:\n|$)/is);
    if (sceneMatch) {
      sceneDescription = sceneMatch[1].trim();
      text = text.replace(/SCENE_DESCRIPTION:\s*.+/is, '');
    }

    // Clean up the story text
    text = text
      .replace(/STORY:\s*/i, '')
      .trim();

    return {
      title,
      text,
      sceneDescription,
    };
  }

  /**
   * Generate image for episode
   */
  private async generateEpisodeImage(
    sceneDescription: string,
    template: StoryTemplate,
    dayNumber: number,
    user: User
  ): Promise<{ imageUrl: string; provider: 'replicate' | 'openai' }> {
    // Get user's photo for face consistency
    const photos = await getUserPhotos(user.id);
    const userPhotoUrl = photos.length > 0 ? photos[0].photo_url : undefined;

    // If no user photo, return a placeholder
    if (!userPhotoUrl) {
      return {
        imageUrl: this.getPlaceholderImage(template, dayNumber),
        provider: 'replicate',
      };
    }

    // Create a Scene object from the description
    const scene: Scene = {
      description: sceneDescription,
      camera: {
        shot: 'medium-shot',
        angle: 'eye-level',
        distance: 'at a comfortable conversational distance',
      },
      lighting: {
        type: 'soft-diffused',
        quality: 'natural, flattering light that enhances romantic mood',
      },
      emotion: 'confident',
      environment: template.visualStyle.settingImagery.split(',')[0] || 'Modern urban setting',
      atmosphere: template.visualStyle.moodDetails.split('.')[0] || 'Romantic and intimate',
      isSafe: true,
    };

    const userGender = (user.gender as 'male' | 'female') || 'male';

    // Generate image using the scene
    const result = await generatePersonalizedImage({
      userPhotoUrl,
      scene,
      gender: userGender,
    });

    return {
      imageUrl: result.imageUrl,
      provider: result.provider,
    };
  }

  /**
   * Get placeholder image when no user photo is available
   */
  private getPlaceholderImage(template: StoryTemplate, dayNumber: number): string {
    // For now, return a simple placeholder
    // In production, this could use a stock image service or AI-generated image without face
    return `https://via.placeholder.com/512x768/1a1a2e/ffffff?text=Day+${dayNumber}`;
  }

  /**
   * Build image prompt (legacy, kept for reference)
   */
  private buildImagePrompt(
    sceneDescription: string,
    template: StoryTemplate,
    dayNumber: number
  ): string {
    const style = template.visualStyle;

    return `Romantic story illustration:

**SCENE:** ${sceneDescription}

**VISUAL STYLE:**
- Tone: ${style.toneColor}
- Setting: ${style.settingImagery}
- Mood: ${style.moodDetails}

**REQUIREMENTS:**
- Cinematic, high-quality illustration
- Focus on emotional connection between characters
- Appropriate for Day ${dayNumber} of romance story arc
- No text or watermarks`;
  }

  /**
   * Get user's active photo URL
   */
  private async getUserPhotoUrl(userId: string): Promise<string | undefined> {
    try {
      const photos = await getUserPhotos(userId);
      return photos.length > 0 ? photos[0].photo_url : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Summarize an episode for continuity
   */
  private summarizeEpisode(text: string, maxLength: number = 50): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 'Content unavailable';

    let summary = sentences[0].trim();
    for (let i = 1; i < sentences.length && summary.length < maxLength; i++) {
      summary += ' ' + sentences[i].trim();
    }

    return summary.length > maxLength
      ? summary.substring(0, maxLength) + '...'
      : summary;
  }

  /**
   * Get default protagonist name from template
   */
  private getDefaultProtagonistName(template: StoryTemplate, userGender: string): string {
    // Extract name from summary or use gender-specific defaults
    const nameMatch = template.summary.match(/([A-Z][a-z]+) (?:was|is)/);
    if (nameMatch) return nameMatch[1];

    // Gender-specific defaults
    const femaleDefaults: Record<string, string> = {
      'Romance': 'Emma',
      'Dark Romance': 'Bella',
      'Fantasy Romance': 'Celeste',
      'New Adult': 'Ella',
      'Taboo Romance': 'Haley',
      'Romantic Comedy': 'Natalie',
      'Celebrity Romance': 'Zoe',
      'Forbidden Romance': 'Olivia',
    };

    const maleDefaults: Record<string, string> = {
      'Romance': 'Liam',
      'Dark Romance': 'Nico',
      'Fantasy Romance': 'Kieran',
      'New Adult': 'Logan',
      'Taboo Romance': 'Cole',
      'Romantic Comedy': 'Adam',
      'Celebrity Romance': 'Ethan',
      'Forbidden Romance': 'Alexander',
    };

    // Use male or female defaults based on user gender
    if (userGender === 'male') {
      return maleDefaults[template.genre] || 'Liam';
    }
    return femaleDefaults[template.genre] || 'Emma';
  }

  /**
   * Get default love interest name from template
   */
  private getDefaultLoveInterestName(template: StoryTemplate, userGender: string): string {
    // Extract name from summary or use gender-specific defaults
    const names = template.summary.match(/\b([A-Z][a-z]+)\b/g) || [];
    const excludedNames = ['Emma', 'Bella', 'Celeste', 'Ella', 'Haley', 'Natalie', 'Zoe', 'Olivia', 'Sophia', 'Victoria', 'Mia', 'Isabella', 'Chloe', 'Hannah', 'Angela', 'Tessa', 'Lily', 'Sofia',
      'Liam', 'Nico', 'Kieran', 'Logan', 'Cole', 'Adam', 'Ethan', 'Alexander', 'Jacob', 'Ryan', 'Tyler', 'Brandon', 'Kevin'];
    const foundName = names.find(name => !excludedNames.includes(name));
    if (foundName) return foundName;

    // Gender-specific defaults for love interest (opposite of protagonist)
    const femaleLoveInterestDefaults: Record<string, string> = {
      'Romance': 'Emma',
      'Dark Romance': 'Bella',
      'Fantasy Romance': 'Celeste',
      'New Adult': 'Ella',
      'Taboo Romance': 'Haley',
      'Romantic Comedy': 'Natalie',
      'Celebrity Romance': 'Zoe',
      'Forbidden Romance': 'Olivia',
    };

    const maleLoveInterestDefaults: Record<string, string> = {
      'Romance': 'Liam',
      'Dark Romance': 'Nico',
      'Fantasy Romance': 'Kieran',
      'New Adult': 'Logan',
      'Taboo Romance': 'Cole',
      'Romantic Comedy': 'Adam',
      'Celebrity Romance': 'Ethan',
      'Forbidden Romance': 'Alexander',
    };

    // Love interest should be opposite gender of user
    if (userGender === 'male') {
      return femaleLoveInterestDefaults[template.genre] || 'Emma';
    }
    return maleLoveInterestDefaults[template.genre] || 'Liam';
  }
}

// ============================================
// Export Singleton (Lazy-Loaded)
// ============================================

let instance: StoryArcGenerator | null = null;

export function getStoryArcGenerator(): StoryArcGenerator {
  if (!instance) {
    instance = new StoryArcGenerator();
  }
  return instance;
}

// Convenience export that auto-initializes on first access
export const storyArcGenerator = new Proxy({} as any, {
  get(_target, prop) {
    const generator = getStoryArcGenerator();
    return generator[prop as keyof StoryArcGenerator];
  }
});