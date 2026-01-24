/**
 * Story Arc Routes
 *
 * API endpoints for managing 30-day story arcs and episodes.
 *
 * Endpoints:
 * - GET /arcs/active - Get user's active story arc
 * - POST /arcs/start - Start a new story arc
 * - GET /arcs/:arcId - Get story arc details
 * - GET /arcs/:arcId/episodes - Get all episodes for a story arc
 * - GET /arcs/:arcId/episodes/:episodeNumber - Get specific episode
 * - POST /arcs/:arcId/generate - Generate next episode
 * - POST /episodes/:episodeId/feedback - Submit episode feedback
 * - GET /templates - List available story templates
 * - GET /templates/recommended - Get recommended templates
 */

import { Router, Response } from 'express';

// Helper function to extract string value from potentially array-typed Express params/body/query
function getString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function getOptionalString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
import {
  getUserById,
  getActiveStoryArc,
  getStoryArcById,
  createStoryArc,
  updateStoryArc,
  completeStoryArc,
  getEpisodeByNumber,
  getEpisodesByArc,
  getLatestEpisode,
  createStoryEpisode,
  updateEpisodeDelivered,
  updateEpisodeFeedback,
  getTodayEpisode,
} from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { westernStoryTemplates } from '../services/westernStoryTemplates';
import { storyArcGenerator } from '../services/storyArcGenerator';

const router = Router();

// All story arc routes require authentication
router.use(authenticateToken);

// ============================================
// Story Arc Management
// ============================================

/**
 * GET /arcs/active
 * Get user's active story arc (if any)
 */
router.get('/active', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const arc = await getActiveStoryArc(userId);

    if (!arc) {
      return res.status(404).json({
        error: 'No active story arc',
        hasActiveArc: false,
      });
    }

    // Get template details
    const template = westernStoryTemplates.getTemplate(arc.story_template_id);

    res.json({
      hasActiveArc: true,
      arc: {
        id: arc.id,
        title: arc.title,
        genre: arc.genre,
        emotion: arc.emotion,
        currentDay: arc.current_day,
        totalDays: arc.total_days,
        startedAt: arc.started_at,
        template: template ? {
          summary: template.summary,
          visualStyle: template.visualStyle,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get active arc error:', error);
    res.status(500).json({ error: 'Failed to get active story arc' });
  }
});

/**
 * POST /arcs/start
 * Start a new story arc
 *
 * Body: {
 *   templateId?: string,      // Optional: specific template ID
 *   genre?: string,           // Optional: genre preference
 *   emotion?: string,         // Optional: emotion preference
 *   userName?: string,        // Optional: custom protagonist name
 *   loveInterestName?: string // Optional: custom love interest name
 * }
 */
router.post('/start', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { templateId, genre, emotion, userName, loveInterestName } = req.body;

  try {
    // Check if user already has an active arc
    const existingArc = await getActiveStoryArc(userId);
    if (existingArc) {
      return res.status(400).json({
        error: 'User already has an active story arc',
        activeArc: {
          id: existingArc.id,
          title: existingArc.title,
          currentDay: existingArc.current_day,
        },
      });
    }

    // Check if user has completed onboarding
    const user = await getUserById(userId);
    if (!user || !user.is_onboarded) {
      return res.status(400).json({ error: 'Please complete onboarding first' });
    }

    // Check daily limit for non-premium users
    const isPremium = user.is_premium === 1;
    const FREE_DAILY_LIMIT = 1;

    if (!isPremium) {
      // Check if user has started a story arc today (this counts as generation)
      const { getContentGeneration } = await import('../models/database');
      const today = new Date().toISOString().split('T')[0];
      const existingGeneration = await getContentGeneration(userId, today);

      if (existingGeneration) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: 'You\'ve reached your daily limit for starting a new story. Upgrade to premium for unlimited access!',
          canGenerate: false,
          isPremium: false,
        });
      }
    }

    // Select template
    let template;
    if (templateId) {
      template = westernStoryTemplates.getTemplate(templateId);
    } else if (genre || emotion) {
      const templates = westernStoryTemplates.getTemplatesForUser({ genre, emotion });
      template = templates[Math.floor(Math.random() * templates.length)];
    } else {
      template = westernStoryTemplates.getRecommendedTemplates()[
        Math.floor(Math.random() * 5)
      ];
    }

    if (!template) {
      return res.status(404).json({ error: 'No suitable template found' });
    }

    // Create story arc
    const arc = await createStoryArc({
      user_id: userId,
      story_template_id: template.id,
      title: template.title,
      summary: template.summary,
      genre: template.genre,
      emotion: template.emotion,
      total_days: 30,
    });

    console.log(`Created story arc ${arc.id} for user ${userId}`);

    res.json({
      arc: {
        id: arc.id,
        title: arc.title,
        genre: arc.genre,
        emotion: arc.emotion,
        currentDay: arc.current_day,
        totalDays: arc.total_days,
        startedAt: arc.started_at,
        template: {
          summary: template.summary,
          visualStyle: template.visualStyle,
        },
      },
      userName: userName,
      loveInterestName: loveInterestName,
    });
  } catch (error) {
    console.error('Start story arc error:', error);
    res.status(500).json({ error: 'Failed to start story arc' });
  }
});

// ============================================
// Template Discovery
// NOTE: These routes must come BEFORE /:arcId to avoid conflicts
// ============================================

/**
 * GET /arcs/templates/list
 * List all available story templates
 */
router.get('/templates/list', async (req: AuthRequest, res: Response) => {
  try {
    const templates = westernStoryTemplates.getAllTemplates();

    res.json({
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        genre: t.genre,
        emotion: t.emotion,
        themeKeywords: t.themeKeywords,
        summary: t.summary,
      })),
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * GET /arcs/templates/recommended
 * Get recommended templates for new users
 */
router.get('/templates/recommended', async (req: AuthRequest, res: Response) => {
  try {
    const templates = westernStoryTemplates.getRecommendedTemplates();

    res.json({
      templates: templates.map(t => ({
        id: t.id,
        title: t.title,
        genre: t.genre,
        emotion: t.emotion,
        themeKeywords: t.themeKeywords,
        summary: t.summary,
      })),
    });
  } catch (error) {
    console.error('Get recommended templates error:', error);
    res.status(500).json({ error: 'Failed to get recommended templates' });
  }
});

/**
 * GET /arcs/:arcId
 * Get story arc details
 */
router.get('/:arcId', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const arcId = getString(req.params.arcId);

  try {
    const arc = await getStoryArcById(arcId);

    if (!arc) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    // Verify ownership
    if (arc.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const template = westernStoryTemplates.getTemplate(arc.story_template_id);
    const episodes = await getEpisodesByArc(arcId);

    res.json({
      arc: {
        id: arc.id,
        title: arc.title,
        genre: arc.genre,
        emotion: arc.emotion,
        status: arc.status,
        currentDay: arc.current_day,
        totalDays: arc.total_days,
        startedAt: arc.started_at,
        completedAt: arc.completed_at,
        template: template ? {
          summary: template.summary,
          visualStyle: template.visualStyle,
          emotionalTone: template.emotionalTone,
        } : null,
      },
      episodes: episodes.map(ep => ({
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title,
        deliveredAt: ep.delivered_at,
        feedback: ep.feedback,
      })),
    });
  } catch (error) {
    console.error('Get story arc error:', error);
    res.status(500).json({ error: 'Failed to get story arc' });
  }
});

/**
 * GET /arcs/:arcId/episodes
 * Get all episodes for a story arc
 */
router.get('/:arcId/episodes', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const arcId = getString(req.params.arcId);

  try {
    const arc = await getStoryArcById(arcId);

    if (!arc || arc.user_id !== userId) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    const episodes = await getEpisodesByArc(arcId);

    res.json({
      episodes: episodes.map(ep => ({
        id: ep.id,
        episodeNumber: ep.episode_number,
        title: ep.title,
        deliveredAt: ep.delivered_at,
        feedback: ep.feedback,
        imageUrl: ep.image_url,
      })),
    });
  } catch (error) {
    console.error('Get episodes error:', error);
    res.status(500).json({ error: 'Failed to get episodes' });
  }
});

/**
 * GET /arcs/:arcId/episodes/:episodeNumber
 * Get specific episode (full content)
 */
router.get('/:arcId/episodes/:episodeNumber', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const arcId = getString(req.params.arcId);
  const episodeNumber = parseInt(getString(req.params.episodeNumber));

  try {
    const arc = await getStoryArcById(arcId);

    if (!arc || arc.user_id !== userId) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    const episode = await getEpisodeByNumber(arcId, episodeNumber);

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.json({
      episode: {
        id: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title,
        text: episode.text,
        imageUrl: episode.image_url,
        deliveredAt: episode.delivered_at,
        feedback: episode.feedback,
      },
    });
  } catch (error) {
    console.error('Get episode error:', error);
    res.status(500).json({ error: 'Failed to get episode' });
  }
});

// ============================================
// Episode Generation
// ============================================

/**
 * POST /arcs/:arcId/generate
 * Generate the next episode in the story arc
 *
 * Body: {
 *   userName?: string,        // Optional: custom protagonist name
 *   loveInterestName?: string // Optional: custom love interest name
 * }
 */
router.post('/:arcId/generate', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const arcId = getString(req.params.arcId);
  const { userName, loveInterestName } = req.body;

  try {
    const arc = await getStoryArcById(arcId);

    if (!arc || arc.user_id !== userId) {
      return res.status(404).json({ error: 'Story arc not found' });
    }

    if (arc.status !== 'active') {
      return res.status(400).json({ error: 'Story arc is not active' });
    }

    // Check if episode already exists for current day
    const existingEpisode = await getEpisodeByNumber(arcId, arc.current_day);
    if (existingEpisode) {
      return res.status(400).json({
        error: 'Episode already generated for today',
        episode: {
          id: existingEpisode.id,
          episodeNumber: existingEpisode.episode_number,
          title: existingEpisode.title,
          text: existingEpisode.text,
          imageUrl: existingEpisode.image_url,
        },
      });
    }

    // Check if story arc is complete
    if (arc.current_day > arc.total_days) {
      // Mark arc as completed
      await completeStoryArc(arcId);
      return res.status(400).json({
        error: 'Story arc complete',
        message: 'Congratulations! You\'ve completed all 30 episodes of this story.',
        arcComplete: true,
      });
    }

    // Get user for premium check
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check daily limit for non-premium users
    const isPremium = user.is_premium === 1;
    const FREE_DAILY_LIMIT = 1;

    if (!isPremium) {
      const { getContentGeneration } = await import('../models/database');
      const today = new Date().toISOString().split('T')[0];
      const existingGeneration = await getContentGeneration(userId, today);

      if (existingGeneration) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: 'You\'ve reached your daily limit. Come back tomorrow or upgrade to premium for unlimited access!',
          canGenerate: false,
          isPremium: false,
        });
      }
    }

    // Generate episode
    console.log(`Generating episode ${arc.current_day} for arc ${arcId}`);

    const result = await storyArcGenerator.generateEpisode({
      storyArcId: arcId,
      dayNumber: arc.current_day,
      user,
      userName,
      loveInterestName,
    });

    // Save episode to database
    const episode = await createStoryEpisode({
      story_arc_id: arcId,
      episode_number: arc.current_day,
      title: result.episode.title,
      text: result.episode.text,
      image_url: result.imageUrl,
      scene_description: result.episode.sceneDescription,
      story_provider: result.storyProvider,
      image_provider: result.imageProvider,
      story_generation_time_ms: result.generationTimeMs,
      image_generation_time_ms: 0, // Will be updated from actual result
      cost_estimate: 0.001, // Approximate cost
    });

    // Mark as delivered
    await updateEpisodeDelivered(episode.id);

    // Track generation for free users
    if (!isPremium) {
      const { createContentGeneration } = await import('../models/database');
      const today = new Date().toISOString().split('T')[0];
      await createContentGeneration({ user_id: userId, generated_date: today });
    }

    // Update arc progress
    const nextDay = arc.current_day + 1;
    await updateStoryArc(arcId, {
      current_day: nextDay,
    });

    // Check if arc is complete
    if (nextDay > arc.total_days) {
      await completeStoryArc(arcId);
    }

    console.log(`Successfully generated episode ${episode.id}`);

    res.json({
      episode: {
        id: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title,
        text: episode.text,
        imageUrl: episode.image_url,
        deliveredAt: episode.delivered_at,
      },
      arc: {
        currentDay: nextDay,
        totalDays: arc.total_days,
        isComplete: nextDay > arc.total_days,
      },
      canGenerate: isPremium || nextDay <= arc.total_days,
      isPremium,
    });
  } catch (error) {
    console.error('Generate episode error:', error);
    res.status(500).json({ error: 'Failed to generate episode' });
  }
});

// ============================================
// Episode Feedback
// ============================================

/**
 * POST /episodes/:episodeId/feedback
 * Submit feedback for an episode
 *
 * Body: {
 *   rating: 'like' | 'neutral' | 'dislike'
 * }
 */
router.post('/episodes/:episodeId/feedback', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const episodeId = getString(req.params.episodeId);
  const { rating } = req.body;

  if (!rating || !['like', 'neutral', 'dislike'].includes(rating)) {
    return res.status(400).json({ error: 'Invalid rating. Must be: like, neutral, or dislike' });
  }

  try {
    // Get episode and verify ownership through arc
    const { getEpisodeById } = await import('../models/database');

    // Note: We need to add getEpisodeById to database.ts or query directly
    // For now, we'll update feedback directly
    const episode = await updateEpisodeFeedback(episodeId, rating);

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    // Get arc to verify ownership
    const arc = await getStoryArcById(episode.story_arc_id);
    if (!arc || arc.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`Recorded feedback ${rating} for episode ${episodeId}`);

    res.json({
      success: true,
      feedback: rating,
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;

