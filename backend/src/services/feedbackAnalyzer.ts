/**
 * Feedback Analyzer Service
 * Learns from user feedback to improve content generation
 */

import { queryAll, queryGet, db } from '../models/database';
import { User } from '../models/database';

export interface FeedbackPattern {
  // Which genre/emotion combinations user likes most
  preferredGenres: string[];
  preferredEmotions: string[];
  // Which themes/topics user enjoys (from story text analysis)
  preferredThemes: string[];
  // User's satisfaction score (0-1)
  satisfactionScore: number;
}

export interface UserFeedbackInsights {
  userId: string;
  totalFeedback: number;
  likeCount: number;
  neutralCount: number;
  dislikeCount: number;
  // Preferred combinations
  topGenreEmotionCombos: Array<{
    genre: string;
    emotion: string;
    likePercentage: number;
    count: number;
  }>;
  // Recommendations
  suggestedGenre: string | null;
  suggestedEmotion: string | null;
  confidence: number; // 0-1, how confident we are in suggestions
}

/**
 * Analyze user's feedback history to get insights
 */
export async function analyzeUserFeedback(userId: string): Promise<UserFeedbackInsights> {
  // Get all content with feedback for this user
  const rows = queryAll<any>(
    `SELECT
      dc.id,
      u.genre_preference,
      u.emotion_preference,
      f.rating,
      dc.text,
      dc.created_at
     FROM daily_contents dc
     JOIN users u ON u.id = dc.user_id
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = ? AND f.rating IS NOT NULL
     ORDER BY dc.created_at ASC`,
    [userId]
  );

  // Extract genre/emotion from content text if it contains metadata
  // Format: "Test story X - genre emotion content"
  const rowsWithMetadata = rows.map((row: any) => {
    let genre = row.genre_preference;
    let emotion = row.emotion_preference;

    // Try to extract from text if format matches
    const textMatch = row.text.match(/Test story \d+ - (\w+) (\w+) /);
    if (textMatch) {
      genre = textMatch[1];
      emotion = textMatch[2];
    }

    return { ...row, extracted_genre: genre, extracted_emotion: emotion };
  });

  const totalFeedback = rows.length;
  const likeCount = rows.filter((r: any) => r.rating === 'like').length;
  const neutralCount = rows.filter((r: any) => r.rating === 'neutral').length;
  const dislikeCount = rows.filter((r: any) => r.rating === 'dislike').length;

  // Group by genre/emotion combinations
  const comboStats = new Map<string, { like: number; total: number; genre: string; emotion: string }>();

  for (const row of rowsWithMetadata) {
    const key = `${row.extracted_genre}|${row.extracted_emotion}`;
    if (!comboStats.has(key)) {
      comboStats.set(key, {
        like: 0,
        total: 0,
        genre: row.extracted_genre,
        emotion: row.extracted_emotion
      });
    }
    const stats = comboStats.get(key)!;
    stats.total++;
    if (row.rating === 'like') {
      stats.like++;
    }
  }

  // Calculate top combinations
  const topCombos = Array.from(comboStats.values())
    .filter(s => s.total >= 2) // Only consider combos with at least 2 data points
    .map(s => ({
      genre: s.genre,
      emotion: s.emotion,
      likePercentage: (s.like / s.total) * 100,
      count: s.total
    }))
    .sort((a, b) => b.likePercentage - a.likePercentage)
    .slice(0, 3);

  // Generate suggestions based on best performing combo
  let suggestedGenre: string | null = null;
  let suggestedEmotion: string | null = null;
  let confidence = 0;

  if (topCombos.length > 0) {
    const best = topCombos[0];
    // Only suggest if we have good data
    if (best.count >= 3 && best.likePercentage >= 60) {
      suggestedGenre = best.genre;
      suggestedEmotion = best.emotion;
      confidence = Math.min(best.likePercentage / 100, 1);
    }
  }

  return {
    userId,
    totalFeedback,
    likeCount,
    neutralCount,
    dislikeCount,
    topGenreEmotionCombos: topCombos,
    suggestedGenre,
    suggestedEmotion,
    confidence
  };
}

/**
 * Get personalized genre/emotion suggestions for a user
 * Returns suggestions if we're confident enough, otherwise null
 */
export async function getPersonalizedSuggestions(
  userId: string
): Promise<{ genre: string | null; emotion: string | null; confidence: number }> {
  const insights = await analyzeUserFeedback(userId);

  // Only return suggestions if we have enough data
  if (insights.totalFeedback >= 5 && insights.confidence >= 0.6) {
    return {
      genre: insights.suggestedGenre,
      emotion: insights.suggestedEmotion,
      confidence: insights.confidence
    };
  }

  return { genre: null, emotion: null, confidence: 0 };
}

/**
 * Should we use feedback-based personalization for this user?
 */
export async function shouldUsePersonalization(userId: string): Promise<boolean> {
  const insights = await analyzeUserFeedback(userId);
  return insights.totalFeedback >= 5 && insights.confidence >= 0.6;
}

/**
 * Auto-adjust user preferences based on feedback
 * Call this when user consistently dislikes content with current preferences
 */
export async function shouldSuggestPreferenceChange(userId: string): Promise<{
  shouldSuggest: boolean;
  suggestedGenre?: string;
  suggestedEmotion?: string;
  reason?: string;
}> {
  // Get user's current preferences
  const userRow = queryGet<any>('SELECT genre_preference, emotion_preference FROM users WHERE id = ?', [userId]);
  if (!userRow) {
    return { shouldSuggest: false };
  }

  const currentGenre = userRow.genre_preference;
  const currentEmotion = userRow.emotion_preference;

  const insights = await analyzeUserFeedback(userId);

  // Find the satisfaction rate with user's current preferences
  const currentComboStats = insights.topGenreEmotionCombos.find(
    c => c.genre === currentGenre && c.emotion === currentEmotion
  );

  // User is consistently unhappy with current preferences
  if (currentComboStats && currentComboStats.count >= 2) {
    const currentSatisfaction = currentComboStats.likePercentage;

    // If satisfaction with current preferences is low (less than 40% likes), suggest change
    if (currentSatisfaction < 40 && insights.topGenreEmotionCombos.length > 1) {
      // Find the best alternative (not the current one)
      const bestCombo = insights.topGenreEmotionCombos.find(
        c => !(c.genre === currentGenre && c.emotion === currentEmotion)
      );

      if (bestCombo && bestCombo.likePercentage >= 60) {
        return {
          shouldSuggest: true,
          suggestedGenre: bestCombo.genre,
          suggestedEmotion: bestCombo.emotion,
          reason: `You only liked ${currentSatisfaction.toFixed(0)}% of stories with your current preferences. Try ${bestCombo.genre} + ${bestCombo.emotion} instead (you liked ${bestCombo.likePercentage.toFixed(0)}% of those)`
        };
      }
    }
  }

  return { shouldSuggest: false };
}

/**
 * Get user's current satisfaction trend (improving, declining, stable)
 */
export async function getSatisfactionTrend(userId: string): Promise<'improving' | 'declining' | 'stable' | 'unknown'> {
  const rows = queryAll<any>(
    `SELECT
      f.rating,
      dc.created_at
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = ? AND f.rating IS NOT NULL
     ORDER BY dc.created_at DESC
     LIMIT 10`,
    [userId]
  );

  if (rows.length < 5) return 'unknown';

  const recent = rows.slice(0, Math.floor(rows.length / 2));
  const older = rows.slice(Math.floor(rows.length / 2));

  const recentLikeRate = recent.filter((r: any) => r.rating === 'like').length / recent.length;
  const olderLikeRate = older.filter((r: any) => r.rating === 'like').length / older.length;

  const difference = recentLikeRate - olderLikeRate;

  if (difference > 0.2) return 'improving';
  if (difference < -0.2) return 'declining';
  return 'stable';
}
