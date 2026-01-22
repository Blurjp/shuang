import { Router, Response } from 'express';
import { getFeedbackByContentId, createFeedback, verifyContentOwnership, db, getUserById, updateUser } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { analyzeUserFeedback, shouldSuggestPreferenceChange, getPersonalizedSuggestions, getSatisfactionTrend } from '../services/feedbackAnalyzer';

const router = Router();

// All feedback routes require authentication
router.use(authenticateToken);

// Get user's feedback insights and analytics
router.get('/insights/user', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const insights = await analyzeUserFeedback(userId);
    const trend = await getSatisfactionTrend(userId);
    const suggestion = await shouldSuggestPreferenceChange(userId);

    res.json({
      ...insights,
      trend,
      suggestion
    });
  } catch (error) {
    console.error('Get feedback insights error:', error);
    res.status(500).json({ error: 'Failed to get feedback insights' });
  }
});

// Get personalized suggestions based on feedback
router.get('/suggestions/user', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const suggestions = await getPersonalizedSuggestions(userId);

    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

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
    const ownsContent = await verifyContentOwnership(content_id, userId);

    if (!ownsContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Check if feedback already exists
    const existingFeedback = await getFeedbackByContentId(content_id);

    if (existingFeedback) {
      // Update existing feedback - we need to delete and recreate since we don't have an update function
      db.prepare('DELETE FROM feedback WHERE content_id = ?').run(content_id);
    }

    // Insert new feedback
    await createFeedback({
      content_id,
      rating
    });

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
    const ownsContent = await verifyContentOwnership(contentId, userId);

    if (!ownsContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const feedback = await getFeedbackByContentId(contentId);

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
