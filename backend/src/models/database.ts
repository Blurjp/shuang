import { Pool, PoolClient, QueryResult } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Type exports
export interface User {
  id: string;
  email: string | null;
  anonymous_id: string | null;
  gender: string | null;
  genre_preference: string | null;
  emotion_preference: string | null;
  push_token_ios: string | null;
  push_token_android: string | null;
  is_onboarded: number;
  is_premium: number;
  created_at: Date;
  updated_at: Date;
}

export interface DailyContent {
  id: string;
  user_id: string;
  text: string;
  image_url: string;
  date: string;
  delivered_at: Date | null;
  created_at: Date;
  feedback?: 'like' | 'neutral' | 'dislike' | null;
}

export interface Feedback {
  id: string;
  content_id: string;
  rating: string;
  created_at: Date;
}

export interface UserPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  is_active: number;
  created_at: Date;
}

export interface ContentGeneration {
  id: string;
  user_id: string;
  generated_date: string;
  created_at: Date;
}

// Database connection check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Log the DATABASE_URL for debugging (hide password)
    const dbUrl = process.env.DATABASE_URL || '';
    const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('DATABASE_URL (safe):', safeUrl);
    console.log('DATABASE_URL length:', dbUrl.length);

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await pool.end();
}

// Helper function to run a query
async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<any>> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

// User queries
export async function getUserById(id: string): Promise<User | null> {
  const res = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const res = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return res.rows[0] || null;
}

export async function getUserByAnonymousId(anonymousId: string): Promise<User | null> {
  const res = await query<User>(
    'SELECT * FROM users WHERE anonymous_id = $1',
    [anonymousId]
  );
  return res.rows[0] || null;
}

export async function createUser(data: {
  id?: string;
  email?: string;
  anonymous_id?: string;
  gender?: string;
  genre_preference?: string;
  emotion_preference?: string;
}): Promise<User> {
  const id = data.id || generateId();
  const res = await query<User>(
    `INSERT INTO users (id, email, anonymous_id, gender, genre_preference, emotion_preference)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, data.email || null, data.anonymous_id || null, data.gender || null, data.genre_preference || null, data.emotion_preference || null]
  );
  return res.rows[0];
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return getUserById(id);

  values.push(id);
  const res = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return res.rows[0] || null;
}

// Daily Content queries
export async function getDailyContent(userId: string, date: string): Promise<DailyContent | null> {
  const res = await query<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = $1 AND dc.date = $2`,
    [userId, date]
  );
  return res.rows[0] || null;
}

export async function createDailyContent(data: {
  user_id: string;
  text: string;
  image_url: string;
  date: string;
}): Promise<DailyContent> {
  const id = generateId();
  const res = await query<DailyContent>(
    `INSERT INTO daily_contents (id, user_id, text, image_url, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, data.user_id, data.text, data.image_url, data.date]
  );
  return res.rows[0];
}

export async function updateDailyContent(id: string, data: Partial<DailyContent>): Promise<DailyContent | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  const res = await query<DailyContent>(
    `UPDATE daily_contents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return res.rows[0] || null;
}

export async function getDailyContentsBeforeDate(userId: string, date: string, limit: number): Promise<DailyContent[]> {
  const res = await query<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = $1 AND dc.date < $2
     ORDER BY dc.date DESC
     LIMIT $3`,
    [userId, date, limit]
  );
  return res.rows;
}

export async function getDailyContentByIdAndUser(contentId: string, userId: string): Promise<DailyContent | null> {
  const res = await query<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.id = $1 AND dc.user_id = $2`,
    [contentId, userId]
  );
  return res.rows[0] || null;
}

export async function verifyContentOwnership(contentId: string, userId: string): Promise<boolean> {
  const res = await query(
    'SELECT id FROM daily_contents WHERE id = $1 AND user_id = $2',
    [contentId, userId]
  );
  return (res.rowCount || 0) > 0;
}

// Feedback queries
export async function getFeedbackByContentId(contentId: string): Promise<Feedback | null> {
  const res = await query<Feedback>(
    'SELECT * FROM feedback WHERE content_id = $1',
    [contentId]
  );
  return res.rows[0] || null;
}

export async function createFeedback(data: {
  content_id: string;
  rating: string;
}): Promise<Feedback> {
  const id = generateId();
  const res = await query<Feedback>(
    `INSERT INTO feedback (id, content_id, rating)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, data.content_id, data.rating]
  );
  return res.rows[0];
}

// User Photo queries
export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  const res = await query<UserPhoto>(
    'SELECT * FROM user_photos WHERE user_id = $1 AND is_active = 1 ORDER BY created_at DESC',
    [userId]
  );
  return res.rows;
}

export async function createUserPhoto(data: {
  user_id: string;
  photo_url: string;
}): Promise<UserPhoto> {
  const id = generateId();
  const res = await query<UserPhoto>(
    `INSERT INTO user_photos (id, user_id, photo_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, data.user_id, data.photo_url]
  );
  return res.rows[0];
}

export async function deactivateUserPhotos(userId: string): Promise<void> {
  await query(
    'UPDATE user_photos SET is_active = 0 WHERE user_id = $1',
    [userId]
  );
}

export async function deactivateUserPhoto(photoId: string): Promise<void> {
  await query(
    'UPDATE user_photos SET is_active = 0 WHERE id = $1',
    [photoId]
  );
}

// Content Generation queries
export async function getContentGeneration(userId: string, date: string): Promise<ContentGeneration | null> {
  const res = await query<ContentGeneration>(
    'SELECT * FROM content_generations WHERE user_id = $1 AND generated_date = $2',
    [userId, date]
  );
  return res.rows[0] || null;
}

export async function createContentGeneration(data: {
  user_id: string;
  generated_date: string;
}): Promise<ContentGeneration> {
  const id = generateId();
  const res = await query<ContentGeneration>(
    `INSERT INTO content_generations (id, user_id, generated_date)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, data.user_id, data.generated_date]
  );
  return res.rows[0];
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  await query(`
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS daily_contents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      image_url TEXT NOT NULL,
      date TEXT NOT NULL,
      delivered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, date)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      content_id TEXT UNIQUE NOT NULL,
      rating TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES daily_contents(id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS content_generations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      generated_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, generated_date)
    );
  `);

  console.log('Database tables initialized');
}

// Helper function to generate UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export the pool for transactions
export { pool };
