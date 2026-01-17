import { prisma } from '../models/database';

async function initDatabase() {
  console.log('Checking database connection...');

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');

    // Note: With Prisma, migrations are handled via:
    // npx prisma migrate deploy (for production)
    // npx prisma migrate dev (for development)

    console.log('Database is ready to use!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Please ensure DATABASE_URL is set correctly and the database is accessible.');
    console.error('Run "npx prisma migrate dev" to create the database schema.');
    process.exit(1);
  }
}

initDatabase();
