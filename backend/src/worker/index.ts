import { getUserById, getDailyContent, createDailyContent, createContentGeneration, getUserPhotos, pool } from '../models/database';
import { contentGenerator } from '../services/contentGenerator';
import type { User } from '../models/database';

/**
 * Generate daily content for a single user
 */
async function generateContentForUser(userId: string, date: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if content already exists for this user and date
    const existing = await getDailyContent(userId, date);

    if (existing) {
      console.log(`Content already exists for user ${userId} on ${date}`);
      await client.query('ROLLBACK');
      return;
    }

    // Get user preferences
    const user = await getUserById(userId);

    if (!user) {
      console.error(`User ${userId} not found`);
      await client.query('ROLLBACK');
      return;
    }

    // Skip users who haven't completed onboarding
    if (!user.is_onboarded) {
      console.log(`User ${userId} has not completed onboarding, skipping`);
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Generating content for user ${userId}...`);

    // Get user's active photos (use the most recent one)
    const userPhotos = await getUserPhotos(userId);
    const userPhotoUrl = userPhotos.length > 0 ? userPhotos[0].photo_url : undefined;

    if (userPhotoUrl) {
      console.log(`Found user photo, will use for image generation`);
    }

    // Generate story text
    const text = await contentGenerator.generateStory(user as User);

    // Generate image URL (with user photo if available)
    const imageUrl = await contentGenerator.generateImage(text, user as User, userPhotoUrl);

    // Store in database and track generation
    const content = await createDailyContent({
      user_id: userId,
      text,
      image_url: imageUrl,
      date
    });

    await createContentGeneration({
      user_id: userId,
      generated_date: date
    });

    await client.query('COMMIT');
    console.log(`Successfully generated content ${content.id} for user ${userId}`);

    // TODO: Schedule push notification for 8:00 AM
    // await schedulePushNotification(userId, contentId);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to generate content for user ${userId}:`, error);
  } finally {
    client.release();
  }
}

/**
 * Generate daily content for all onboarded users
 */
export async function generateDailyContentForAll(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`Starting daily content generation for ${today}...`);

  try {
    // Get all onboarded users with push tokens
    const result = await pool.query(
      'SELECT id FROM users WHERE is_onboarded = 1 AND (push_token_ios IS NOT NULL OR push_token_android IS NOT NULL)'
    );

    const users = result.rows;

    console.log(`Found ${users.length} users to generate content for`);

    // Process users sequentially to avoid overwhelming the APIs
    for (const user of users) {
      await generateContentForUser(user.id, today);
      // Add a small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Daily content generation complete!');
  } catch (error) {
    console.error('Failed to generate daily content:', error);
  }
}

/**
 * Manually trigger content generation for a specific user
 * Useful for testing
 */
export async function generateContentForUserNow(userId: string): Promise<any> {
  const today = new Date().toISOString().split('T')[0];

  await generateContentForUser(userId, today);

  const content = await getDailyContent(userId, today);

  return content;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'generate-all') {
    generateDailyContentForAll()
      .then(() => {
        console.log('Done!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else if (command === 'generate-user') {
    const userId = args[1];
    if (!userId) {
      console.error('Usage: npm run worker generate-user <user-id>');
      process.exit(1);
    }

    generateContentForUserNow(userId)
      .then((content) => {
        console.log('Generated content:', content);
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  npm run worker generate-all    # Generate content for all users');
    console.log('  npm run worker generate-user <id>  # Generate content for specific user');
    process.exit(1);
  }
}
