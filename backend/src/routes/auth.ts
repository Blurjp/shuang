import { Router, Request, Response } from 'express';
import { getUserByEmail, getUserByAnonymousId, createUser } from '../models/database';
import { generateToken } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Register / Login (unified for MVP - accepts email or anonymous)
router.post('/register', async (req: Request, res: Response) => {
  const { email, anonymous_id } = req.body;

  if (!email && !anonymous_id) {
    return res.status(400).json({ error: 'Email or anonymous_id is required' });
  }

  try {
    let userId: string;
    let token: string;

    if (email) {
      // Check if user exists
      const existingUser = await getUserByEmail(email);

      if (existingUser) {
        // User exists, return token
        token = generateToken(existingUser.id);
        return res.json({ user_id: existingUser.id, token });
      }

      // Create new user with email
      const newUser = await createUser({ email });
      userId = newUser.id;
      token = generateToken(userId);
    } else {
      // Check if anonymous user exists
      const existingUser = await getUserByAnonymousId(anonymous_id!);

      if (existingUser) {
        token = generateToken(existingUser.id);
        return res.json({ user_id: existingUser.id, token });
      }

      // Create new anonymous user
      const newUser = await createUser({ anonymous_id });
      userId = newUser.id;
      token = generateToken(userId);
    }

    res.json({ user_id: userId, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Simple login (for email users)
router.post('/login', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken(user.id);
    res.json({ user_id: user.id, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
