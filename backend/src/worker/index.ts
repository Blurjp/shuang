import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../models/database';
import { contentGenerator } from '../services/contentGenerator';
import type { User } from '../models/database';

/**
 * Generate daily content for a single user
 */
async function generateContentForUser(userId: string, date: string): Promise<void> {
  try {
    // Check if content already exists for this user and date
    const existing = await prisma.dailyContent.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: date
        }
      }
    });

    if (existing) {
      console.log(`Content already exists for user ${userId} on ${date}`);
      return;
    }

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

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
    const userPhoto = await prisma.userPhoto.findFirst({
      where: {
        user_id: userId,
        is_active: 1
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1
    });

    const userPhotoUrl = userPhoto?.photo_url;

    if (userPhotoUrl) {
      console.log(`Found user photo, will use for image generation`);
    }

    // Generate story text
    const text = await contentGenerator.generateStory(user as User);

    // Generate image URL (with user photo if available)
    const imageUrl = await contentGenerator.generateImage(text, user as User, userPhotoUrl);

    // Store in database and track generation
    const contentId = uuidv4();
    const generationId = uuidv4();

    await prisma.$transaction([
      prisma.dailyContent.create({
        data: {
          id: contentId,
          user_id: userId,
          text,
          image_url: imageUrl,
          date
        }
      }),
      prisma.contentGeneration.create({
        data: {
          id: generationId,
          user_id: userId,
          generated_date: date
        }
      })
    ]);

    console.log(`Successfully generated content ${contentId} for user ${userId}`);

    // TODO: Schedule push notification for 8:00 AM
    // await schedulePushNotification(userId, contentId);

  } catch (error) {
    console.error(`Failed to generate content for user ${userId}:`, error);
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
    const users = await prisma.user.findMany({
      where: {
        is_onboarded: 1,
        OR: [
          { push_token_ios: { not: null } },
          { push_token_android: { not: null } }
        ]
      },
      select: {
        id: true
      }
    });

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

  const content = await prisma.dailyContent.findUnique({
    where: {
      user_id_date: {
        user_id: userId,
        date: today
      }
    }
  });

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
