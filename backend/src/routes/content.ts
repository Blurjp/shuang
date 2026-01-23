import { Router, Response } from 'express';
import { getUserById, getDailyContent, createDailyContent, updateDailyContent, getContentGeneration, createContentGeneration, getUserPhotos, getDailyContentsBeforeDate, getDailyContentByIdAndUser } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { contentGenerator } from '../services/contentGenerator';

const router = Router();

// All content routes require authentication
router.use(authenticateToken);

// Get today's content
router.get('/today', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`[DEBUG] Getting today's content for userId: ${userId}, date: ${today}`);

  try {
    const content = await getDailyContent(userId, today);

    if (!content) {
      // Check user's generation status
      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isPremium = user.is_premium === 1;
      const FREE_DAILY_LIMIT = 1;

      let remainingGenerations = FREE_DAILY_LIMIT;
      if (!isPremium) {
        // Count today's generations by checking if generation record exists
        const generation = await getContentGeneration(userId, today);
        remainingGenerations = generation ? FREE_DAILY_LIMIT - 1 : FREE_DAILY_LIMIT;
      }

      return res.status(404).json({
        error: 'No content available for today',
        canGenerate: remainingGenerations > 0 || isPremium,
        isPremium: isPremium,
        remainingGenerations: isPremium ? -1 : remainingGenerations
      });
    }

    res.json({
      id: content.id,
      text: content.text,
      image_url: content.image_url,
      date: content.date,
      delivered_at: content.delivered_at,
      feedback: content.feedback
    });
  } catch (error) {
    console.error('Get today content error:', error);
    res.status(500).json({ error: 'Failed to get today\'s content' });
  }
});

// Get content history (last 7 days)
router.get('/history', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const days = parseInt(req.query.days as string) || 7;
  const today = new Date().toISOString().split('T')[0];

  try {
    const contents = await getDailyContentsBeforeDate(userId, today, days);

    const history = contents.map((content) => ({
      id: content.id,
      text_preview: content.text.substring(0, 50) + (content.text.length > 50 ? '...' : ''),
      image_url: content.image_url,
      date: content.date,
      feedback: content.feedback
    }));

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get specific content by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const contentId = req.params.id as string;

  try {
    const content = await getDailyContentByIdAndUser(contentId, userId);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({
      id: content.id,
      text: content.text,
      image_url: content.image_url,
      date: content.date,
      delivered_at: content.delivered_at,
      feedback: content.feedback
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Manually generate new content
router.post('/generate', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get user to check if premium
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has completed onboarding
    if (!user.is_onboarded) {
      return res.status(400).json({ error: 'Please complete onboarding first' });
    }

    // Check daily limit for non-premium users
    const isPremium = user.is_premium === 1;
    const FREE_DAILY_LIMIT = 1;

    if (!isPremium) {
      const existingGeneration = await getContentGeneration(userId, today);

      if (existingGeneration) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: 'You\'ve reached your daily limit for free content generation. Upgrade to premium for unlimited access!',
          canGenerate: false,
          isPremium: false
        });
      }
    }

    // Check if content already exists for today
    const existingContent = await getDailyContent(userId, today);

    // For free users, prevent regeneration
    if (!isPremium && existingContent) {
      return res.status(400).json({
        error: 'Content already exists',
        message: 'Content for today has already been generated',
        canGenerate: false
      });
    }

    // For non-premium users, apply rate limiting (1 request per minute)
    if (!isPremium) {
      const rateLimitKey = `content_gen_${userId}`;
      const now = Date.now();
      const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
      const RATE_LIMIT_MAX = 1;

      // Simple in-memory rate limit check (for production, use Redis)
      if (req.rateLimitCache && req.rateLimitCache[rateLimitKey]) {
        const lastRequest = req.rateLimitCache[rateLimitKey];
        if (now - lastRequest.timestamp < RATE_LIMIT_WINDOW) {
          const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest.timestamp)) / 1000);
          return res.status(429).json({
            error: 'Content generation rate limit exceeded. Please wait before generating again.',
            retryAfter: retryAfter
          });
        }
      }

      // Update rate limit cache (initialize if needed)
      if (!req.rateLimitCache) {
        req.rateLimitCache = {};
      }
      req.rateLimitCache[rateLimitKey] = { timestamp: now };
    }

    // Get user's active photo
    const userPhotos = await getUserPhotos(userId);
    const userPhotoUrl = userPhotos.length > 0 ? userPhotos[0].photo_url : undefined;

    // Generate content
    console.log(`Generating content for user ${userId}...`);

    // Generate story with metadata (provider info)
    const storyResult = await contentGenerator.generateStoryWithMetadata(user);
    const text = storyResult.story;

    // Generate image with metadata (provider info)
    const imageResult = await contentGenerator.generateImageWithMetadata(text, user, userPhotoUrl);
    const imageUrl = imageResult.imageUrl;

    // Calculate total cost
    const totalCost = (imageResult.costEstimate || 0) + 0.001; // Story generation ~ $0.001

    // Store or update content with provider tracking
    let content;
    if (existingContent) {
      // Premium user regenerating content - update existing
      console.log(`Updating existing content ${existingContent.id} for user ${userId}`);
      content = await updateDailyContent(existingContent.id, {
        text,
        image_url: imageUrl,
        story_provider: storyResult.provider,
        image_provider: imageResult.provider,
        story_generation_time_ms: storyResult.generationTimeMs,
        image_generation_time_ms: imageResult.generationTimeMs,
        cost_estimate: totalCost,
        scene_description: storyResult.sceneDescription,
      });
      if (!content) {
        throw new Error('Failed to update content');
      }
    } else {
      // First time generating content today
      content = await createDailyContent({
        user_id: userId,
        text,
        image_url: imageUrl,
        date: today,
        story_provider: storyResult.provider,
        image_provider: imageResult.provider,
        story_generation_time_ms: storyResult.generationTimeMs,
        image_generation_time_ms: imageResult.generationTimeMs,
        cost_estimate: totalCost,
        scene_description: storyResult.sceneDescription,
      });

      // Track generation (only for first generation of the day)
      await createContentGeneration({
        user_id: userId,
        generated_date: today
      });
    }

    console.log(`Provider tracking - Story: ${storyResult.provider}, Image: ${imageResult.provider}, Cost: $${totalCost.toFixed(4)}`);

    console.log(`Successfully generated content ${content.id} for user ${userId}`);

    res.json({
      id: content.id,
      text,
      image_url: imageUrl,
      date: today,
      canGenerate: true, // Premium users can always generate more
      isPremium: isPremium,
      remainingGenerations: isPremium ? -1 : FREE_DAILY_LIMIT - 1
    });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

export default router;
