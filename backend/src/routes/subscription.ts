import { Router, Response } from 'express';
import { getUserById, updateUser } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All subscription routes require authentication
router.use(authenticateToken);

/**
 * GET /subscription/status
 * Get user's subscription status
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPremium = user.is_premium === 1;

    res.json({
      is_premium: isPremium,
      expiration_date: null, // TODO: Store expiration date in database
      auto_renew_enabled: isPremium // Assuming auto-renew for now
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * POST /subscription/status
 * Update user's subscription status (called from iOS app after successful purchase)
 */
router.post('/status', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { is_premium, expiration_date } = req.body;

  // Validate input
  if (typeof is_premium !== 'boolean') {
    return res.status(400).json({ error: 'is_premium must be a boolean' });
  }

  try {
    // Update user's premium status
    await updateUser(userId, {
      is_premium: is_premium ? 1 : 0
    });

    console.log(`✅ User ${userId} subscription updated: is_premium=${is_premium}`);

    res.json({
      success: true,
      is_premium: is_premium
    });
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ error: 'Failed to update subscription status' });
  }
});

/**
 * POST /subscription/webhook
 * Webhook endpoint for receiving subscription updates from Apple (optional)
 * This would be used if you implement server-side subscription verification
 */
router.post('/webhook', async (req: AuthRequest, res: Response) => {
  const { notification_type, latest_receipt, password } = req.body;

  // TODO: Implement Apple App Store Server Notification handling
  // This requires:
  // 1. Verify the notification comes from Apple
  // 2. Decode the receipt
  // 3. Extract subscription status
  // 4. Update user's premium status in database

  console.log('📬 Received subscription webhook:', notification_type);

  // For now, just acknowledge receipt
  res.json({ received: true });
});

export default router;
