import Database from 'better-sqlite3';
import path from 'path';

// Get database path from environment or use default
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.db');

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Use WAL mode for better concurrency
db.pragma('journal_mode = WAL');

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
    console.log('SQLite database path:', dbPath);

    // Test query
    db.prepare('SELECT 1').get();

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  db.close();
  console.log('Database connection closed');
}

// Type helper for query results
type Row<T> = T & any;

// Helper function to run a query
export function queryAll<T = any>(sql: string, params: any[] = []): Row<T>[] {
  const start = Date.now();
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Row<T>[];
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, rows: rows.length });
    return rows;
  } catch (error) {
    console.error('Database query error', { sql, error });
    throw error;
  }
}

export function queryGet<T = any>(sql: string, params: any[] = []): Row<T> | undefined {
  const start = Date.now();
  try {
    const stmt = db.prepare(sql);
    const row = stmt.get(...params) as Row<T> | undefined;
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, row: row ? 'found' : 'not found' });
    return row;
  } catch (error) {
    console.error('Database query error', { sql, error });
    throw error;
  }
}

function queryRun(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  const start = Date.now();
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    const duration = Date.now() - start;
    console.log('Executed query', { sql, duration, changes: result.changes });
    // Convert bigint to number for compatibility
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes
    };
  } catch (error) {
    console.error('Database query error', { sql, error });
    throw error;
  }
}

// User queries
export async function getUserById(id: string): Promise<User | null> {
  const row = queryGet<User>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  return row || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const row = queryGet<User>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return row || null;
}

export async function getUserByAnonymousId(anonymousId: string): Promise<User | null> {
  const row = queryGet<User>(
    'SELECT * FROM users WHERE anonymous_id = ?',
    [anonymousId]
  );
  return row || null;
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
  queryRun(
    `INSERT INTO users (id, email, anonymous_id, gender, genre_preference, emotion_preference)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.email || null, data.anonymous_id || null, data.gender || null, data.genre_preference || null, data.emotion_preference || null]
  );
  const row = queryGet<User>('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to create user');
  return row;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getUserById(id);

  values.push(id);
  queryRun(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getUserById(id);
}

// Daily Content queries
export async function getDailyContent(userId: string, date: string): Promise<DailyContent | null> {
  const row = queryGet<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = ? AND dc.date = ?`,
    [userId, date]
  );
  return row || null;
}

export async function createDailyContent(data: {
  user_id: string;
  text: string;
  image_url: string;
  date: string;
}): Promise<DailyContent> {
  const id = generateId();
  queryRun(
    `INSERT INTO daily_contents (id, user_id, text, image_url, date)
     VALUES (?, ?, ?, ?, ?)`,
    [id, data.user_id, data.text, data.image_url, data.date]
  );
  const row = queryGet<DailyContent>('SELECT * FROM daily_contents WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to create daily content');
  return row;
}

export async function updateDailyContent(id: string, data: Partial<DailyContent>): Promise<DailyContent | null> {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;

  values.push(id);
  queryRun(
    `UPDATE daily_contents SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  // Get updated content by ID only (no userId filter needed after update)
  const row = queryGet<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.id = ?`,
    [id]
  );
  return row || null;
}

export async function getDailyContentsBeforeDate(userId: string, date: string, limit: number): Promise<DailyContent[]> {
  const rows = queryAll<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.user_id = ? AND dc.date < ?
     ORDER BY dc.date DESC
     LIMIT ?`,
    [userId, date, limit]
  );
  return rows;
}

export async function getDailyContentByIdAndUser(contentId: string, userId: string): Promise<DailyContent | null> {
  const row = queryGet<DailyContent>(
    `SELECT dc.*, f.rating as feedback
     FROM daily_contents dc
     LEFT JOIN feedback f ON f.content_id = dc.id
     WHERE dc.id = ? AND dc.user_id = ?`,
    [contentId, userId]
  );
  return row || null;
}

export async function verifyContentOwnership(contentId: string, userId: string): Promise<boolean> {
  const row = queryGet(
    'SELECT id FROM daily_contents WHERE id = ? AND user_id = ?',
    [contentId, userId]
  );
  return row !== undefined;
}

// Feedback queries
export async function getFeedbackByContentId(contentId: string): Promise<Feedback | null> {
  const row = queryGet<Feedback>(
    'SELECT * FROM feedback WHERE content_id = ?',
    [contentId]
  );
  return row || null;
}

export async function createFeedback(data: {
  content_id: string;
  rating: string;
}): Promise<Feedback> {
  const id = generateId();
  queryRun(
    `INSERT INTO feedback (id, content_id, rating)
     VALUES (?, ?, ?)`,
    [id, data.content_id, data.rating]
  );
  const row = queryGet<Feedback>('SELECT * FROM feedback WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to create feedback');
  return row;
}

// User Photo queries
export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  const rows = queryAll<UserPhoto>(
    'SELECT * FROM user_photos WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

export async function createUserPhoto(data: {
  user_id: string;
  photo_url: string;
}): Promise<UserPhoto> {
  const id = generateId();
  queryRun(
    `INSERT INTO user_photos (id, user_id, photo_url)
     VALUES (?, ?, ?)`,
    [id, data.user_id, data.photo_url]
  );
  const row = queryGet<UserPhoto>('SELECT * FROM user_photos WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to create user photo');
  return row;
}

export async function deactivateUserPhotos(userId: string): Promise<void> {
  queryRun(
    'UPDATE user_photos SET is_active = 0 WHERE user_id = ?',
    [userId]
  );
}

export async function deactivateUserPhoto(photoId: string): Promise<void> {
  queryRun(
    'UPDATE user_photos SET is_active = 0 WHERE id = ?',
    [photoId]
  );
}

// Content Generation queries
export async function getContentGeneration(userId: string, date: string): Promise<ContentGeneration | null> {
  const row = queryGet<ContentGeneration>(
    'SELECT * FROM content_generations WHERE user_id = ? AND generated_date = ?',
    [userId, date]
  );
  return row || null;
}

export async function createContentGeneration(data: {
  user_id: string;
  generated_date: string;
}): Promise<ContentGeneration> {
  const id = generateId();
  queryRun(
    `INSERT INTO content_generations (id, user_id, generated_date)
     VALUES (?, ?, ?)`,
    [id, data.user_id, data.generated_date]
  );
  const row = queryGet<ContentGeneration>('SELECT * FROM content_generations WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to create content generation');
  return row;
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      content_id TEXT UNIQUE NOT NULL,
      rating TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES daily_contents(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_generations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      generated_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, generated_date)
    );
  `);

  console.log('✅ Database tables initialized');
}

// Helper function to generate UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export the database instance for transactions
export { db };
