import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All feedback routes require authentication
router.use(authenticateToken);

// Submit feedback
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { content_id, rating } = req.body;

  if (!content_id || !rating) {
    return res.status(400).json({ error: 'content_id and rating are required' });
  }

  const validRatings = ['like', 'neutral', 'dislike'];
  if (!validRatings.includes(rating)) {
    return res.status(400).json({ error: 'Invalid rating' });
  }

  try {
    // Verify the content belongs to the user
    const content = await prisma.dailyContent.findFirst({
      where: {
        id: content_id,
        user_id: userId
      },
      select: { id: true }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if feedback already exists
    const existingFeedback = await prisma.feedback.findUnique({
      where: { content_id }
    });

    if (existingFeedback) {
      // Update existing feedback
      await prisma.feedback.update({
        where: { content_id },
        data: { rating }
      });
    } else {
      // Insert new feedback
      const feedbackId = uuidv4();
      await prisma.feedback.create({
        data: {
          id: feedbackId,
          content_id,
          rating
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get feedback for a content (already included in content endpoints, but useful to have separately)
router.get('/:content_id', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const contentId = req.params.content_id as string;

  try {
    // Verify the content belongs to the user
    const content = await prisma.dailyContent.findFirst({
      where: {
        id: contentId,
        user_id: userId
      },
      select: { id: true }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { content_id: contentId },
      select: { rating: true }
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ rating: feedback.rating });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

export default router;
