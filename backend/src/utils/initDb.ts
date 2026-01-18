import { checkDatabaseConnection, initializeDatabase } from '../models/database';

async function initDatabase() {
  console.log('Checking database connection...');

  try {
    // Test database connection
    const isConnected = await checkDatabaseConnection();

    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database connection successful!');

    // Initialize database tables
    await initializeDatabase();

    console.log('Database is ready to use!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Please ensure DATABASE_URL is set correctly and the database is accessible.');
    process.exit(1);
  }
}

initDatabase();
