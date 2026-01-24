/**
 * Integration Tests: Story Arc Routes
 *
 * Tests for story arc API endpoints.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import storyArcRoutes from '../../routes/storyArcs';
import {
  initializeDatabase,
  createUser,
  getUserByEmail,
  createStoryArc,
  createStoryEpisode,
} from '../../models/database';

// Mock the storyArcGenerator to avoid actual API calls
jest.mock('../../services/storyArcGenerator', () => ({
  getStoryArcGenerator: jest.fn(() => ({
    generateEpisode: jest.fn().mockResolvedValue({
      episode: {
        title: 'Test Episode',
        text: 'This is a test episode content.',
        sceneDescription: 'A test scene',
      },
      imageUrl: 'https://example.com/test-image.jpg',
      storyProvider: 'claude' as const,
      imageProvider: 'replicate' as const,
      generationTimeMs: 1000,
    }),
  })),
  storyArcGenerator: {
    generateEpisode: jest.fn().mockResolvedValue({
      episode: {
        title: 'Test Episode',
        text: 'This is a test episode content.',
        sceneDescription: 'A test scene',
      },
      imageUrl: 'https://example.com/test-image.jpg',
      storyProvider: 'claude' as const,
      imageProvider: 'replicate' as const,
      generationTimeMs: 1000,
    }),
  },
}));

describe('Story Arc Routes Integration Tests', () => {
  let db: Database.Database;
  let app: express.Express;
  let testUserId: string;
  let authToken: string;

  // Helper function to create authenticated user
  function createTestUser(email: string, isPremium: boolean = false) {
    const userId = db.prepare(`INSERT INTO users (
      email, password_hash, is_onboarded, gender, is_premium,
      preferred_genres, preferred_emotions
    ) VALUES (?, ?, 1, 'female', ?, ?, ?)
    RETURNING id`).get(email, 'hashedpassword', isPremium ? 1 : 0, '[]', '[]') as { id: string };

    return userId.id;
  }

  // Helper function to generate auth token
  function generateAuthToken(userId: string): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }

  beforeAll(() => {
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.DATABASE_URL = ':memory:';

    // Initialize database
    db = initializeDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Add middleware to parse request bodies
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Mock authenticated user
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as { userId: string };
          (req as any).userId = decoded.userId;
        } catch (error) {
          // Invalid token - continue without setting userId
        }
      }
      next();
    });

    // Register story arc routes
    app.use('/api/arcs', storyArcRoutes);

    // Error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  beforeEach(() => {
    // Create test user
    testUserId = createTestUser('test@example.com');
    authToken = generateAuthToken(testUserId);
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM story_episodes WHERE story_arc_id IN (SELECT id FROM story_arcs WHERE user_id = ?)').run(testUserId);
    db.prepare('DELETE FROM story_arcs WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM content_generations WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  describe('GET /api/arcs/active', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/arcs/active')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when no active arc exists', async () => {
      const response = await request(app)
        .get('/api/arcs/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'No active story arc',
        hasActiveArc: false,
      });
    });

    it('should return active story arc when exists', async () => {
      // Create active arc
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Test Active Story',
        summary: 'An active story',
        genre: 'Romance',
        emotion: 'Revenge',
      });

      const response = await request(app)
        .get('/api/arcs/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.hasActiveArc).toBe(true);
      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.id).toBe(arc.id);
      expect(response.body.arc.title).toBe('Test Active Story');
    });
  });

  describe('POST /api/arcs/start', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .send({ templateId: 'sweet_revenge_shattered_vows' })
        .expect(401);
    });

    it('should create a new story arc with template', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateId: 'sweet_revenge_shattered_vows' })
        .expect(200);

      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.id).toBeDefined();
      expect(response.body.arc.title).toBe('Shattered Vows');
      expect(response.body.arc.totalDays).toBe(30);
      expect(response.body.arc.currentDay).toBe(1);
    });

    it('should create a story arc with genre preference', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ genre: 'Romance' })
        .expect(200);

      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.genre).toBe('Romance');
    });

    it('should create a story arc with emotion preference', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emotion: 'Forbidden Love' })
        .expect(200);

      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.emotion).toBe('Forbidden Love');
    });

    it('should return 400 when user already has active arc', async () => {
      // Create first arc
      createStoryArc({
        user_id: testUserId,
        story_template_id: 'template1',
        title: 'First Arc',
        summary: 'First',
        genre: 'Romance',
        emotion: 'Love',
      });

      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateId: 'sweet_revenge_shattered_vows' })
        .expect(400);

      expect(response.body.error).toBe('User already has an active story arc');
    });

    it('should create arc with custom character names', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'sweet_revenge_shattered_vows',
          userName: 'Victoria',
          loveInterestName: 'Adrian',
        })
        .expect(200);

      expect(response.body.userName).toBe('Victoria');
      expect(response.body.loveInterestName).toBe('Adrian');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/arcs/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateId: 'non_existent_template' })
        .expect(404);

      expect(response.body.error).toBe('No suitable template found');
    });
  });

  describe('GET /api/arcs/templates/list', () => {
    it('should return all templates', async () => {
      const response = await request(app)
        .get('/api/arcs/templates/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should include template fields', async () => {
      const response = await request(app)
        .get('/api/arcs/templates/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const template = response.body.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('genre');
      expect(template).toHaveProperty('emotion');
      expect(template).toHaveProperty('themeKeywords');
      expect(template).toHaveProperty('summary');
    });
  });

  describe('GET /api/arcs/templates/recommended', () => {
    it('should return recommended templates', async () => {
      const response = await request(app)
        .get('/api/arcs/templates/recommended')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
      expect(response.body.templates.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/arcs/:arcId', () => {
    it('should return story arc details', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Detail Test Story',
        summary: 'Testing arc details',
        genre: 'Romance',
        emotion: 'Love',
      });

      const response = await request(app)
        .get(`/api/arcs/${arc.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.id).toBe(arc.id);
      expect(response.body.arc.title).toBe('Detail Test Story');
    });

    it('should return 404 for non-existent arc', async () => {
      const response = await request(app)
        .get('/api/arcs/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Story arc not found');
    });

    it('should return 403 for arc owned by different user', async () => {
      // Create arc for different user
      const otherUserId = createTestUser('other@example.com');
      const otherArc = createStoryArc({
        user_id: otherUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Other User Arc',
        summary: 'Not your arc',
        genre: 'Romance',
        emotion: 'Love',
      });

      const response = await request(app)
        .get(`/api/arcs/${otherArc.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');

      // Cleanup
      db.prepare('DELETE FROM story_arcs WHERE id = ?').run(otherArc.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(otherUserId);
    });

    it('should include episodes in response', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Episodes Test',
        summary: 'Testing episodes',
        genre: 'Romance',
        emotion: 'Love',
      });

      createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Episode 1',
        text: 'First episode',
        image_url: 'https://example.com/ep1.jpg',
      });

      const response = await request(app)
        .get(`/api/arcs/${arc.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.episodes).toBeDefined();
      expect(Array.isArray(response.body.episodes)).toBe(true);
      expect(response.body.episodes.length).toBe(1);
      expect(response.body.episodes[0].episodeNumber).toBe(1);
    });
  });

  describe('GET /api/arcs/:arcId/episodes', () => {
    it('should return all episodes for arc', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Episode List Test',
        summary: 'Testing episode list',
        genre: 'Romance',
        emotion: 'Love',
      });

      createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Episode 1',
        text: 'First',
        image_url: 'https://example.com/ep1.jpg',
      });

      createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 2,
        title: 'Episode 2',
        text: 'Second',
        image_url: 'https://example.com/ep2.jpg',
      });

      const response = await request(app)
        .get(`/api/arcs/${arc.id}/episodes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.episodes).toBeDefined();
      expect(response.body.episodes.length).toBe(2);
    });

    it('should return 404 for non-existent arc', async () => {
      const response = await request(app)
        .get('/api/arcs/non-existent-id/episodes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/arcs/:arcId/episodes/:episodeNumber', () => {
    it('should return full episode content', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Episode Detail Test',
        summary: 'Testing episode detail',
        genre: 'Romance',
        emotion: 'Love',
      });

      createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Full Episode',
        text: 'This is the full episode text content.',
        image_url: 'https://example.com/full-ep.jpg',
        scene_description: 'Scene description',
      });

      const response = await request(app)
        .get(`/api/arcs/${arc.id}/episodes/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.episode).toBeDefined();
      expect(response.body.episode.episodeNumber).toBe(1);
      expect(response.body.episode.title).toBe('Full Episode');
      expect(response.body.episode.text).toBe('This is the full episode text content.');
    });

    it('should return 404 for non-existent episode', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Missing Episode Test',
        summary: 'Testing missing episode',
        genre: 'Romance',
        emotion: 'Love',
      });

      const response = await request(app)
        .get(`/api/arcs/${arc.id}/episodes/99`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Episode not found');
    });
  });

  describe('POST /api/arcs/:arcId/generate', () => {
    it('should generate new episode', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Generation Test',
        summary: 'Testing episode generation',
        genre: 'Romance',
        emotion: 'Revenge',
      });

      const response = await request(app)
        .post(`/api/arcs/${arc.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userName: 'Victoria',
          loveInterestName: 'Adrian',
        })
        .expect(200);

      expect(response.body.episode).toBeDefined();
      expect(response.body.episode.title).toBe('Test Episode');
      expect(response.body.episode.text).toBe('This is a test episode content.');
      expect(response.body.arc).toBeDefined();
      expect(response.body.arc.currentDay).toBe(2);
    });

    it('should return 400 if episode already exists for current day', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Duplicate Test',
        summary: 'Testing duplicate episode',
        genre: 'Romance',
        emotion: 'Love',
      });

      createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Already Generated',
        text: 'Episode 1 content',
        image_url: 'https://example.com/ep1.jpg',
      });

      const response = await request(app)
        .post(`/api/arcs/${arc.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Episode already generated for today');
    });

    it('should return 400 if arc is not active', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Inactive Arc',
        summary: 'Testing inactive arc',
        genre: 'Romance',
        emotion: 'Love',
      });

      // Mark arc as paused
      db.prepare('UPDATE story_arcs SET status = ? WHERE id = ?').run('paused', arc.id);

      const response = await request(app)
        .post(`/api/arcs/${arc.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Story arc is not active');
    });
  });

  describe('POST /api/episodes/:episodeId/feedback', () => {
    it('should submit episode feedback', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Feedback Test',
        summary: 'Testing feedback submission',
        genre: 'Romance',
        emotion: 'Love',
      });

      const episode = createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Rate Me',
        text: 'Episode for feedback',
        image_url: 'https://example.com/rate.jpg',
      });

      const response = await request(app)
        .post(`/api/episodes/${episode.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 'like' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.feedback).toBe('like');

      // Verify feedback was saved
      const savedEpisode = db.prepare('SELECT feedback FROM story_episodes WHERE id = ?').get(episode.id) as { feedback: string };
      expect(savedEpisode.feedback).toBe('like');
    });

    it('should return 400 for invalid rating', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Invalid Rating Test',
        summary: 'Testing invalid rating',
        genre: 'Romance',
        emotion: 'Love',
      });

      const episode = createStoryEpisode({
        story_arc_id: arc.id,
        episode_number: 1,
        title: 'Invalid Rating',
        text: 'Episode with invalid rating',
        image_url: 'https://example.com/invalid.jpg',
      });

      const response = await request(app)
        .post(`/api/episodes/${episode.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid rating');
    });

    it('should support all valid rating types', async () => {
      const ratings = ['like', 'neutral', 'dislike'];

      for (const rating of ratings) {
        const arc = createStoryArc({
          user_id: testUserId,
          story_template_id: 'sweet_revenge_shattered_vows',
          title: `Rating Test ${rating}`,
          summary: `Testing ${rating} rating`,
          genre: 'Romance',
          emotion: 'Love',
        });

        const episode = createStoryEpisode({
          story_arc_id: arc.id,
          episode_number: 1,
          title: `Rating ${rating}`,
          text: `Episode for ${rating}`,
          image_url: `https://example.com/${rating}.jpg`,
        });

        await request(app)
          .post(`/api/episodes/${episode.id}/feedback`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ rating })
          .expect(200);
      }
    });
  });

  describe('Premium User Features', () => {
    let premiumUserId: string;
    let premiumAuthToken: string;

    beforeEach(() => {
      premiumUserId = createTestUser('premium@example.com', true);
      premiumAuthToken = generateAuthToken(premiumUserId);
    });

    afterEach(() => {
      db.prepare('DELETE FROM story_episodes WHERE story_arc_id IN (SELECT id FROM story_arcs WHERE user_id = ?)').run(premiumUserId);
      db.prepare('DELETE FROM story_arcs WHERE user_id = ?').run(premiumUserId);
      db.prepare('DELETE FROM content_generations WHERE user_id = ?').run(premiumUserId);
      db.prepare('DELETE FROM users WHERE id = ?').run(premiumUserId);
    });

    it('should allow premium users unlimited generations', async () => {
      const arc = createStoryArc({
        user_id: premiumUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Premium User Arc',
        summary: 'Premium unlimited generation',
        genre: 'Romance',
        emotion: 'Love',
      });

      // Premium user should be able to generate
      const response = await request(app)
        .post(`/api/arcs/${arc.id}/generate`)
        .set('Authorization', `Bearer ${premiumAuthToken}`)
        .expect(200);

      expect(response.body.episode).toBeDefined();
      expect(response.body.isPremium).toBe(true);
      expect(response.body.canGenerate).toBe(true);
    });
  });

  describe('Daily Limit for Free Users', () => {
    it('should enforce daily generation limit for free users', async () => {
      const arc = createStoryArc({
        user_id: testUserId,
        story_template_id: 'sweet_revenge_shattered_vows',
        title: 'Daily Limit Test',
        summary: 'Testing daily limit',
        genre: 'Romance',
        emotion: 'Love',
      });

      // Generate first episode
      await request(app)
        .post(`/api/arcs/${arc.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to generate another episode on a different arc (same day, same user)
      const arc2 = createStoryArc({
        user_id: testUserId,
        story_template_id: 'fake_dating_office_compromise',
        title: 'Second Arc',
        summary: 'Second arc for limit test',
        genre: 'Romantic Comedy',
        emotion: 'Fake Dating',
      });

      // This should fail due to daily limit
      // Note: The arc needs to be on day 1 with no episode
      const response = await request(app)
        .post(`/api/arcs/${arc2.id}/generate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(429);

      expect(response.body.error).toBe('Daily limit reached');
      expect(response.body.isPremium).toBe(false);
    });
  });
});
