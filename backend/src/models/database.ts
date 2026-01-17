import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Type exports matching the original interfaces
export type {
  User,
  DailyContent,
  Feedback,
  UserPhoto,
  ContentGeneration as ContentGenerationRecord
} from '@prisma/client';

// Extended interface for content with feedback
export interface ContentWithFeedback {
  id: string;
  user_id: string;
  text: string;
  image_url: string;
  date: string;
  delivered_at: string | null;
  created_at: string;
  feedback?: 'like' | 'neutral' | 'dislike' | null;
}

// Helper function to check database connection
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
