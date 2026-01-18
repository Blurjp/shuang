import { Router, Response } from 'express';
import { getUserById, updateUser } from '../models/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Onboarding - Set initial preferences
router.post('/onboarding', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { gender, genre_preference, emotion_preference } = req.body;

  // Validate inputs
  const validGenders = ['male', 'female'];
  const validGenres = ['modern', 'ancient', 'fantasy', 'urban', 'business'];
  const validEmotions = ['favored', 'revenge', 'satisfaction', 'growth'];

  if (!validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender' });
  }
  if (!validGenres.includes(genre_preference)) {
    return res.status(400).json({ error: 'Invalid genre_preference' });
  }
  if (!validEmotions.includes(emotion_preference)) {
    return res.status(400).json({ error: 'Invalid emotion_preference' });
  }

  try {
    await updateUser(userId, {
      gender,
      genre_preference,
      emotion_preference,
      is_onboarded: 1
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// Get user preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      gender: user.gender,
      genre_preference: user.genre_preference,
      emotion_preference: user.emotion_preference
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user preferences
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { gender, genre_preference, emotion_preference } = req.body;

  // Validate inputs
  const validGenders = ['male', 'female'];
  const validGenres = ['modern', 'ancient', 'fantasy', 'urban', 'business'];
  const validEmotions = ['favored', 'revenge', 'satisfaction', 'growth'];

  if (gender && !validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender' });
  }
  if (genre_preference && !validGenres.includes(genre_preference)) {
    return res.status(400).json({ error: 'Invalid genre_preference' });
  }
  if (emotion_preference && !validEmotions.includes(emotion_preference)) {
    return res.status(400).json({ error: 'Invalid emotion_preference' });
  }

  try {
    // Build update data object with only provided fields
    const updateData: any = {};
    if (gender) updateData.gender = gender;
    if (genre_preference) updateData.genre_preference = genre_preference;
    if (emotion_preference) updateData.emotion_preference = emotion_preference;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await updateUser(userId, updateData);

    res.json({ success: true });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Register push token
router.post('/push-token', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { platform, token } = req.body;

  if (!platform || !token) {
    return res.status(400).json({ error: 'Platform and token are required' });
  }

  if (platform !== 'ios' && platform !== 'android') {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  try {
    const updateData = platform === 'ios'
      ? { push_token_ios: token }
      : { push_token_android: token };

    await updateUser(userId, updateData);

    res.json({ success: true });
  } catch (error) {
    console.error('Push token registration error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

export default router;
