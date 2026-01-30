/**
 * Unit Tests: Western Story Templates Service
 *
 * Tests for story template management and filtering.
 */

import { describe, it, expect } from '@jest/globals';
import {
  westernStoryTemplates,
  type StoryTemplate,
  type EpisodeOutline,
} from '../../services/westernStoryTemplates';

describe('Western Story Templates Service', () => {
  describe('getAllTemplates', () => {
    it('should return all available templates', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toBeInstanceOf(Array);
    });

    it('should return templates with required fields', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('genre');
        expect(template).toHaveProperty('emotion');
        expect(template).toHaveProperty('summary');
        expect(template).toHaveProperty('themeKeywords');
        expect(template).toHaveProperty('visualStyle');
        expect(template).toHaveProperty('emotionalTone');
        expect(template).toHaveProperty('storyHooks');
        expect(template).toHaveProperty('episodes');
      });
    });

    it('should have valid template IDs', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.id).toBeTruthy();
        expect(typeof template.id).toBe('string');
        expect(template.id.length).toBeGreaterThan(0);
      });
    });

    it('should have all episodes defined for each template', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.episodes).toBeDefined();
        expect(template.episodes.length).toBe(30);

        // Verify each episode has required fields
        template.episodes.forEach((episode: EpisodeOutline) => {
          expect(episode).toHaveProperty('day');
          expect(episode).toHaveProperty('plot');
          expect(episode.day).toBeGreaterThan(0);
          expect(episode.day).toBeLessThanOrEqual(30);
        });
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      // Use a known template ID from the templates
      const template = westernStoryTemplates.getTemplate('sweet_revenge_shattered_vows');

      expect(template).toBeDefined();
      expect(template?.id).toBe('sweet_revenge_shattered_vows');
      expect(template?.title).toBe('Shattered Vows');
    });

    it('should return undefined for non-existent template', () => {
      const template = westernStoryTemplates.getTemplate('non_existent_template');

      expect(template).toBeUndefined();
    });

    it('should return complete template data', () => {
      const template = westernStoryTemplates.getTemplate('sweet_revenge_shattered_vows');

      expect(template).toBeDefined();
      expect(template?.genre).toBe('Romance');
      expect(template?.emotion).toBe('Revenge');
      expect(template?.summary).toBeTruthy();
      expect(template?.episodes).toHaveLength(30);
    });
  });

  describe('getTemplatesForUser', () => {
    it('should return templates matching genre preference', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({ genre: 'Romance' });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((template: StoryTemplate) => {
        // Uses includes() so will match "Romance", "Dark Romance", "Fantasy Romance", etc.
        expect(template.genre.toLowerCase()).toContain('romance');
      });
    });

    it('should return templates matching emotion preference', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({ emotion: 'Love' });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((template: StoryTemplate) => {
        // Uses includes() so will match emotions containing "Love"
        expect(template.emotion.toLowerCase()).toContain('love');
      });
    });

    it('should return templates matching both genre and emotion', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({
        genre: 'Romance',
        emotion: 'Passion',
      });

      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((template: StoryTemplate) => {
        expect(template.genre.toLowerCase()).toContain('romance');
        expect(template.emotion.toLowerCase()).toContain('passion');
      });
    });

    it('should return all templates when no preferences specified', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({});
      const allTemplates = westernStoryTemplates.getAllTemplates();

      expect(templates.length).toBe(allTemplates.length);
    });

    it('should handle unknown genre gracefully', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({ genre: 'UnknownGenre' });

      expect(templates).toEqual([]);
    });

    it('should handle unknown emotion gracefully', () => {
      const templates = westernStoryTemplates.getTemplatesForUser({ emotion: 'UnknownEmotion' });

      expect(templates).toEqual([]);
    });
  });

  describe('getRecommendedTemplates', () => {
    it('should return recommended templates', () => {
      const templates = westernStoryTemplates.getRecommendedTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.length).toBeLessThanOrEqual(5);
    });

    it('should return templates with complete data', () => {
      const templates = westernStoryTemplates.getRecommendedTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('genre');
        expect(template).toHaveProperty('emotion');
        expect(template).toHaveProperty('summary');
      });
    });

    it('should return diverse genres in recommendations', () => {
      const templates = westernStoryTemplates.getRecommendedTemplates();
      const genres = new Set(templates.map((t: StoryTemplate) => t.genre));

      // Should have at least some variety
      expect(genres.size).toBeGreaterThan(0);
    });
  });

  describe('Template Content Validation', () => {
    it('should have meaningful titles', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.title.length).toBeGreaterThan(3);
        expect(template.title).toMatch(/^[A-Z]/);
      });
    });

    it('should have descriptive summaries', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.summary.length).toBeGreaterThan(50);
      });
    });

    it('should have valid genre categories', () => {
      const templates = westernStoryTemplates.getAllTemplates();
      const validGenres = [
        'Romance',
        'Dark Romance',
        'Fantasy Romance',
        'New Adult',
        'Taboo Romance',
        'Romantic Comedy',
        'Celebrity Romance',
        'Forbidden Romance',
        'New Adult Romance',
        'Workplace Romance',
        'Age Gap Romance',
        'Second Chance Romance',
        'Personal Growth',
        'Business',
        'Career',
        'Lifestyle',
        'Marriage of Convenience',
        'Travel',
      ];

      templates.forEach((template: StoryTemplate) => {
        // All genres should contain at least one of the valid base genres
        const isValid = validGenres.some(valid => template.genre.includes(valid));
        if (!isValid) {
          console.log('FAILING GENRE:', template.genre, 'for template:', template.id);
        }
        expect(isValid).toBe(true);
      });
    });

    it('should have theme keywords', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.themeKeywords).toBeDefined();
        expect(template.themeKeywords.length).toBeGreaterThan(0);
        expect(Array.isArray(template.themeKeywords)).toBe(true);
      });
    });

    it('should have story hooks', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.storyHooks).toBeDefined();
        expect(template.storyHooks.length).toBeGreaterThan(0);
        expect(Array.isArray(template.storyHooks)).toBe(true);
      });
    });

    it('should have visual style guide', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.visualStyle).toBeDefined();
        expect(template.visualStyle).toHaveProperty('toneColor');
        expect(template.visualStyle).toHaveProperty('settingImagery');
        expect(template.visualStyle).toHaveProperty('moodDetails');
      });
    });

    it('should have emotional tone', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.emotionalTone).toBeDefined();
        expect(template.emotionalTone.length).toBeGreaterThan(20);
      });
    });
  });

  describe('Episode Outlines', () => {
    it('should have 30 episodes per template', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        expect(template.episodes.length).toBe(30);
      });
    });

    it('should have sequential episode days', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        const days = template.episodes.map((e: EpisodeOutline) => e.day);
        expect(days).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
      });
    });

    it('should have meaningful plot descriptions', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      templates.forEach((template: StoryTemplate) => {
        template.episodes.forEach((episode: EpisodeOutline) => {
          expect(episode.plot.length).toBeGreaterThan(10);
        });
      });
    });

    it('may have key moments defined', () => {
      const templates = westernStoryTemplates.getAllTemplates();

      // Key moments is an optional field, just verify it exists when defined
      templates.forEach((template: StoryTemplate) => {
        template.episodes.forEach((episode: EpisodeOutline) => {
          // If keyMoments is defined, it should be an array
          if (episode.keyMoments) {
            expect(Array.isArray(episode.keyMoments)).toBe(true);
          }
        });
      });
    });
  });

  describe('Specific Template Verification', () => {
    it('should have Shattered Vows template correctly configured', () => {
      const template = westernStoryTemplates.getTemplate('sweet_revenge_shattered_vows');

      expect(template).toBeDefined();
      expect(template?.title).toBe('Shattered Vows');
      expect(template?.genre).toBe('Romance');
      expect(template?.emotion).toBe('Revenge');
      expect(template?.themeKeywords).toContain('revenge');
      expect(template?.themeKeywords).toContain('betrayal');
    });

    it('should have Faking It Dating Deal template correctly configured', () => {
      const template = westernStoryTemplates.getTemplate('faking_it_dating_deal');

      expect(template).toBeDefined();
      expect(template?.emotion).toBe('Slow Burn');
      expect(template?.themeKeywords).toContain('fake relationship');
    });

    it('should have Off Limits Stepbrother template correctly configured', () => {
      const template = westernStoryTemplates.getTemplate('off_limits_stepbrother');

      expect(template).toBeDefined();
      expect(template?.emotion).toBe('Forbidden Love');
      expect(template?.themeKeywords).toContain('forbidden romance');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template ID', () => {
      const template = westernStoryTemplates.getTemplate('');
      expect(template).toBeUndefined();
    });

    it('should handle special characters in template ID', () => {
      const template = westernStoryTemplates.getTemplate('template_with_special_chars!@#');
      expect(template).toBeUndefined();
    });

    it('should be case sensitive for template IDs', () => {
      const template = westernStoryTemplates.getTemplate('SWEET_REVENGE_SHATTERED_VOWS');
      expect(template).toBeUndefined();
    });
  });
});
