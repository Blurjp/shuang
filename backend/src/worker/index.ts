import { getUserById, getDailyContent, createDailyContent, createContentGeneration, getUserPhotos, db } from '../models/database';
import { contentGenerator } from '../services/contentGenerator';
import type { User } from '../models/database';

/**
 * Generate daily content for a single user
 */
async function generateContentForUser(userId: string, date: string): Promise<void> {
  // Check if content already exists for this user and date
  const existing = await getDailyContent(userId, date);

  if (existing) {
    console.log(`Content already exists for user ${userId} on ${date}`);
    return;
  }

  // Get user preferences
  const user = await getUserById(userId);

  if (!user) {
    console.error(`User ${userId} not found`);
    return;
  }

  // Skip users who haven't completed onboarding
  if (!user.is_onboarded) {
    console.log(`User ${userId} has not completed onboarding, skipping`);
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

  // Use SQLite transaction for database operations
  const insertContent = db.transaction(() => {
    // Store in database and track generation
    const contentStmt = db.prepare(
      `INSERT INTO daily_contents (id, user_id, text, image_url, date)
       VALUES (?, ?, ?, ?, ?)`
    );

    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    contentStmt.run(id, userId, text, imageUrl, date);

    // Track generation
    const genStmt = db.prepare(
      `INSERT INTO content_generations (id, user_id, generated_date)
       VALUES (?, ?, ?)`
    );

    const genId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    genStmt.run(genId, userId, date);

    console.log(`Successfully generated content ${id} for user ${userId}`);
  });

  try {
    insertContent();
  } catch (error) {
    console.error(`Failed to generate content for user ${userId}:`, error);
    throw error;
  }

  // TODO: Schedule push notification for 8:00 AM
  // await schedulePushNotification(userId, contentId);
}

/**
 * Generate daily content for all onboarded users
 */
export async function generateDailyContentForAll(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`Starting daily content generation for ${today}...`);

  try {
    // Get all onboarded users with push tokens
    const rows = db.prepare(
      'SELECT id FROM users WHERE is_onboarded = 1 AND (push_token_ios IS NOT NULL OR push_token_android IS NOT NULL)'
    ).all() as { id: string }[];

    const users = rows;

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
