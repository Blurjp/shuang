import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma, ContentWithFeedback } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { contentGenerator } from '../services/contentGenerator';
import { contentGenerationRateLimit } from '../middleware/rateLimit';

const router = Router();

// All content routes require authentication
router.use(authenticateToken);

// Get today's content
router.get('/today', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`[DEBUG] Getting today's content for userId: ${userId}, date: ${today}`);

  try {
    const content = await prisma.dailyContent.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: today
        }
      },
      include: {
        feedback: {
          select: {
            rating: true
          }
        }
      }
    });

    if (!content) {
      // Check user's generation status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_premium: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isPremium = user.is_premium === 1;
      const FREE_DAILY_LIMIT = 1;

      let remainingGenerations = FREE_DAILY_LIMIT;
      if (!isPremium) {
        const todayGenerations = await prisma.contentGeneration.count({
          where: {
            user_id: userId,
            generated_date: today
          }
        });
        remainingGenerations = FREE_DAILY_LIMIT - todayGenerations;
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
      feedback: content.feedback?.rating
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
    const contents = await prisma.dailyContent.findMany({
      where: {
        user_id: userId,
        date: {
          lt: today
        }
      },
      include: {
        feedback: {
          select: {
            rating: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: days
    });

    const history = contents.map((content) => ({
      id: content.id,
      text_preview: content.text.substring(0, 50) + (content.text.length > 50 ? '...' : ''),
      image_url: content.image_url,
      date: content.date,
      feedback: content.feedback?.rating
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
    const content = await prisma.dailyContent.findFirst({
      where: {
        id: contentId,
        user_id: userId
      },
      include: {
        feedback: {
          select: {
            rating: true
          }
        }
      }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json({
      id: content.id,
      text: content.text,
      image_url: content.image_url,
      date: content.date,
      delivered_at: content.delivered_at,
      feedback: content.feedback?.rating
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Manually generate new content
router.post('/generate', contentGenerationRateLimit, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get user to check if premium
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

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
      const todayGenerations = await prisma.contentGeneration.count({
        where: {
          user_id: userId,
          generated_date: today
        }
      });

      if (todayGenerations >= FREE_DAILY_LIMIT) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: 'You\'ve reached your daily limit for free content generation. Upgrade to premium for unlimited access!',
          canGenerate: false,
          isPremium: false
        });
      }
    }

    // Check if content already exists for today (skip if exists)
    const existingContent = await prisma.dailyContent.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: today
        }
      }
    });

    if (existingContent) {
      return res.status(400).json({
        error: 'Content already exists',
        message: 'Content for today has already been generated',
        canGenerate: false
      });
    }

    // Get user's active photo
    const userPhoto = await prisma.userPhoto.findFirst({
      where: {
        user_id: userId,
        is_active: 1
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1
    });

    const userPhotoUrl = userPhoto?.photo_url;

    // Generate content
    console.log(`Generating content for user ${userId}...`);
    const text = await contentGenerator.generateStory(user);
    const imageUrl = await contentGenerator.generateImage(text, user, userPhotoUrl);

    // Store content and track generation in a transaction
    const contentId = uuidv4();
    const generationId = uuidv4();

    await prisma.$transaction([
      prisma.dailyContent.create({
        data: {
          id: contentId,
          user_id: userId,
          text,
          image_url: imageUrl,
          date: today
        }
      }),
      prisma.contentGeneration.create({
        data: {
          id: generationId,
          user_id: userId,
          generated_date: today
        }
      })
    ]);

    console.log(`Successfully generated content ${contentId} for user ${userId}`);

    res.json({
      id: contentId,
      text,
      image_url: imageUrl,
      date: today,
      canGenerate: !isPremium, // Can generate again if premium
      isPremium: isPremium,
      remainingGenerations: isPremium ? -1 : FREE_DAILY_LIMIT - 1
    });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

export default router;
