/**
 * Unit Tests: Story Arc Database Operations
 *
 * Tests for story arc and episode CRUD operations.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeDatabase,
  createStoryArc,
  getStoryArcById,
  getActiveStoryArc,
  updateStoryArc,
  completeStoryArc,
  createStoryEpisode,
  getEpisodeByNumber,
  getEpisodesByArc,
  updateEpisodeDelivered,
  updateEpisodeFeedback,
  createContentGeneration,
  getContentGeneration,
  type StoryArc,
} from '../../models/database';

describe('Story Arc Database Operations', () => {
  let db: Database.Database;
  let testUserId: string;
  let testArcId: string;

  beforeEach(async () => {
    // Set test environment
    process.env.DATABASE_URL = ':memory:';

    // Initialize in-memory database for testing
    await initializeDatabase();
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Run the migration manually
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        anonymous_id TEXT UNIQUE,
        gender TEXT,
        genre_preference TEXT,
        emotion_preference TEXT,
        push_token_ios TEXT,
        push_token_android TEXT,
        is_onboarded INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        preferred_genres TEXT DEFAULT '[]',
        preferred_emotions TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS story_arcs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        story_template_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        genre TEXT NOT NULL,
        emotion TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        current_day INTEGER DEFAULT 1,
        total_days INTEGER DEFAULT 30,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, status)
      );

      CREATE TABLE IF NOT EXISTS story_episodes (
        id TEXT PRIMARY KEY,
        story_arc_id TEXT NOT NULL,
        episode_number INTEGER NOT NULL,
        title TEXT,
        text TEXT NOT NULL,
        image_url TEXT NOT NULL,
        scene_description TEXT,
        delivered_at TIMESTAMP,
        feedback TEXT CHECK(feedback IN ('like', 'neutral', 'dislike') OR feedback IS NULL),
        story_provider TEXT CHECK(story_provider IN ('claude', 'openai') OR story_provider IS NULL),
        image_provider TEXT CHECK(image_provider IN ('replicate', 'openai') OR image_provider IS NULL),
        story_generation_time_ms INTEGER,
        image_generation_time_ms INTEGER,
        cost_estimate REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
        UNIQUE (story_arc_id, episode_number)
      );

      CREATE TABLE IF NOT EXISTS content_generations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        generated_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, generated_date)
      );
    `);

    // Create a test user
    testUserId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, is_onboarded, gender, is_premium)
      VALUES (?, ?, ?, 1, 'male', 0)
    `).run(testUserId, 'test@example.com', 'hash');
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM story_episodes WHERE story_arc_id IN (SELECT id FROM story_arcs WHERE user_id = ?)').run(testUserId);
    db.prepare('DELETE FROM story_arcs WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM content_generations WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    db.close();
  });

  describe('createStoryArc', () => {
    it('should create a new story arc with default values', async () => {
      const arc = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Test Story',
        summary: 'A test story',
        genre: 'Romance',
        emotion: 'Love',
      });

      expect(arc).toBeDefined();
      expect(arc.id).toBeDefined();
      expect(arc.user_id).toBe(testUserId);
      expect(arc.story_template_id).toBe('test_template');
      expect(arc.title).toBe('Test Story');
      expect(arc.status).toBe('active');
      expect(arc.current_day).toBe(1);
      expect(arc.total_days).toBe(30);
      testArcId = arc.id;
    });

    it('should create a story arc with custom total_days', async () => {
      const arc = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Custom Story',
        summary: 'Custom summary',
        genre: 'Fantasy',
        emotion: 'Wonder',
        total_days: 15,
      });

      expect(arc.total_days).toBe(15);
    });

    it('should generate unique IDs for each story arc', async () => {
      const arc1 = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'template1',
        title: 'Story 1',
        summary: 'Summary 1',
        genre: 'Romance',
        emotion: 'Love',
      });

      const arc2 = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'template2',
        title: 'Story 2',
        summary: 'Summary 2',
        genre: 'Fantasy',
        emotion: 'Wonder',
      });

      expect(arc1.id).not.toBe(arc2.id);
    });
  });

  describe('getStoryArcById', () => {
    it('should return null for non-existent arc', async () => {
      const arc = await getStoryArcById('non-existent-id');
      expect(arc).toBeNull();
    });

    it('should retrieve story arc by ID', async () => {
      const created = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Find Me',
        summary: 'Find this story',
        genre: 'Mystery',
        emotion: 'Suspense',
      });

      const found = await getStoryArcById(created.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });
  });

  describe('getActiveStoryArc', () => {
    it('should return null when user has no active arc', async () => {
      const arc = await getActiveStoryArc(testUserId);
      expect(arc).toBeNull();
    });

    it('should return user\'s active story arc', async () => {
      await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Active Story',
        summary: 'An active story',
        genre: 'Romance',
        emotion: 'Love',
      });

      const arc = await getActiveStoryArc(testUserId);
      expect(arc).not.toBeNull();
      expect(arc?.status).toBe('active');
      expect(arc?.user_id).toBe(testUserId);
    });
  });

  describe('updateStoryArc', () => {
    it('should update story arc fields', async () => {
      const arc = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Original Title',
        summary: 'Original summary',
        genre: 'Romance',
        emotion: 'Love',
      });

      const updated = await updateStoryArc(arc.id, {
        current_day: 5,
        title: 'Updated Title',
      });

      expect(updated).toBeDefined();
      expect(updated?.current_day).toBe(5);

      // Verify the update persisted
      const retrieved = await getStoryArcById(arc.id);
      expect(retrieved?.current_day).toBe(5);
    });
  });

  describe('completeStoryArc', () => {
    it('should mark story arc as completed', async () => {
      const arc = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Complete Me',
        summary: 'This story will be completed',
        genre: 'Romance',
        emotion: 'Love',
      });

      const completed = await completeStoryArc(arc.id);

      expect(completed).toBeDefined();
      if (completed) {
        expect(completed.status).toBe('completed');
        expect(completed.completed_at).not.toBeNull();
      }

      const retrieved = await getStoryArcById(arc.id);
      expect(retrieved?.status).toBe('completed');
    });
  });

  describe('Story Episodes', () => {
    beforeEach(async () => {
      // Create a test story arc for episode tests
      const arc = await createStoryArc({
        user_id: testUserId,
        story_template_id: 'test_template',
        title: 'Episode Test Story',
        summary: 'Story for episode testing',
        genre: 'Romance',
        emotion: 'Love',
      });
      testArcId = arc.id;
    });

    describe('createStoryEpisode', () => {
      it('should create a new episode', async () => {
        const episode = await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 1,
          title: 'First Episode',
          text: 'This is the story text for episode 1.',
          image_url: 'https://example.com/image1.jpg',
          scene_description: 'A romantic sunset scene',
          story_provider: 'claude',
          image_provider: 'replicate',
          story_generation_time_ms: 1500,
          image_generation_time_ms: 3000,
          cost_estimate: 0.005,
        });

        expect(episode).toBeDefined();
        expect(episode.id).toBeDefined();
        expect(episode.story_arc_id).toBe(testArcId);
        expect(episode.episode_number).toBe(1);
        expect(episode.title).toBe('First Episode');
      });

      it('should create episode with minimal required fields', async () => {
        const episode = await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 2,
          text: 'Minimal episode text',
          image_url: 'https://example.com/image2.jpg',
        });

        expect(episode).toBeDefined();
        expect(episode.episode_number).toBe(2);
        expect(episode.text).toBe('Minimal episode text');
      });
    });

    describe('getEpisodeByNumber', () => {
      it('should return null for non-existent episode', async () => {
        const episode = await getEpisodeByNumber(testArcId, 999);
        expect(episode).toBeNull();
      });

      it('should retrieve episode by arc and episode number', async () => {
        await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 4,
          title: 'Find This Episode',
          text: 'Episode content to find',
          image_url: 'https://example.com/image4.jpg',
        });

        const episode = await getEpisodeByNumber(testArcId, 4);
        expect(episode).not.toBeNull();
        expect(episode?.episode_number).toBe(4);
        expect(episode?.title).toBe('Find This Episode');
      });
    });

    describe('getEpisodesByArc', () => {
      it('should return all episodes for an arc in order', async () => {
        await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 1,
          title: 'Episode 1',
          text: 'Text 1',
          image_url: 'https://example.com/img1.jpg',
        });

        await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 2,
          title: 'Episode 2',
          text: 'Text 2',
          image_url: 'https://example.com/img2.jpg',
        });

        const episodes = await getEpisodesByArc(testArcId);
        expect(episodes).toHaveLength(2);
        expect(episodes[0].episode_number).toBe(1);
        expect(episodes[1].episode_number).toBe(2);
      });
    });

    describe('updateEpisodeDelivered', () => {
      it('should mark episode as delivered', async () => {
        const episode = await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 5,
          title: 'Undelivered Episode',
          text: 'Not yet delivered',
          image_url: 'https://example.com/image5.jpg',
        });

        expect(episode.delivered_at).toBeNull();

        const updated = await updateEpisodeDelivered(episode.id);
        if (updated) {
          expect(updated.delivered_at).not.toBeNull();
        }
      });
    });

    describe('updateEpisodeFeedback', () => {
      it('should update episode feedback', async () => {
        const episode = await createStoryEpisode({
          story_arc_id: testArcId,
          episode_number: 6,
          title: 'Feedback Episode',
          text: 'Rate this episode',
          image_url: 'https://example.com/image6.jpg',
        });

        const updated = await updateEpisodeFeedback(episode.id, 'like');
        if (updated) {
          expect(updated.feedback).toBe('like');
        }

        const retrieved = await getEpisodeByNumber(testArcId, 6);
        expect(retrieved?.feedback).toBe('like');
      });

      it('should support all feedback types', async () => {
        const feedbackTypes: Array<'like' | 'neutral' | 'dislike'> = ['like', 'neutral', 'dislike'];

        for (const feedback of feedbackTypes) {
          const episode = await createStoryEpisode({
            story_arc_id: testArcId,
            episode_number: 10 + feedbackTypes.indexOf(feedback),
            text: `Episode for ${feedback}`,
            image_url: `https://example.com/image${10 + feedbackTypes.indexOf(feedback)}.jpg`,
          });

          const updated = await updateEpisodeFeedback(episode.id, feedback);
          if (updated) {
            expect(updated.feedback).toBe(feedback);
          }
        }
      });
    });
  });

  describe('Content Generation Tracking', () => {
    describe('createContentGeneration', () => {
      it('should track content generation for user', async () => {
        const today = new Date().toISOString().split('T')[0];
        const generation = await createContentGeneration({
          user_id: testUserId,
          generated_date: today,
        });

        expect(generation).toBeDefined();
        expect(generation.user_id).toBe(testUserId);
        expect(generation.generated_date.split('T')[0]).toBe(today);
      });
    });

    describe('getContentGeneration', () => {
      it('should return null for non-existent generation record', async () => {
        const futureDate = '2099-12-31';
        const generation = await getContentGeneration(testUserId, futureDate);
        expect(generation).toBeNull();
      });

      it('should retrieve generation record by user and date', async () => {
        const testDate = '2024-01-15';
        await createContentGeneration({
          user_id: testUserId,
          generated_date: testDate,
        });

        const generation = await getContentGeneration(testUserId, testDate);
        expect(generation).not.toBeNull();
        expect(generation?.user_id).toBe(testUserId);
        expect(generation?.generated_date.split('T')[0]).toBe(testDate);
      });
    });
  });
});
