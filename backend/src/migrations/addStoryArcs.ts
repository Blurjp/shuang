/**
 * Migration: Add Story Arcs System
 *
 * This migration adds support for multi-day story arcs (30-day serial narratives).
 *
 * New tables:
 * - story_arcs: Tracks active 30-day story arcs for each user
 * - story_episodes: Individual daily episodes within each story arc
 *
 * This enables:
 * - Serial storytelling with continuous character development
 * - Episode-based content delivery (Day 1, Day 2, etc.)
 * - Story template management (Western market themes)
 * - Progress tracking through narrative arcs
 */

import { db } from '../models/database';

export async function up(): Promise<void> {
  console.log('🔄 Running migration: Add story arcs system...');

  // Create story_arcs table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS story_arcs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        story_template_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        genre TEXT NOT NULL,
        emotion TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        current_day INTEGER DEFAULT 1,
        total_days INTEGER DEFAULT 30,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, status) -- Only one active arc per user
      );
    `);
    console.log('  ✅ Created story_arcs table');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('  ⏭️  story_arcs table already exists');
    } else {
      console.error('  ❌ Error creating story_arcs table:', error.message);
      throw error;
    }
  }

  // Create story_episodes table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS story_episodes (
        id TEXT PRIMARY KEY,
        story_arc_id TEXT NOT NULL,
        episode_number INTEGER NOT NULL,
        title TEXT,
        text TEXT NOT NULL,
        image_url TEXT NOT NULL,
        scene_description TEXT,
        delivered_at TIMESTAMP,
        feedback TEXT CHECK(feedback IN ('like', 'neutral', 'dislike') OR feedback IS NULL),
        story_provider TEXT CHECK(story_provider IN ('claude', 'openai') OR story_provider IS NULL),
        image_provider TEXT CHECK(image_provider IN ('replicate', 'openai') OR image_provider IS NULL),
        story_generation_time_ms INTEGER,
        image_generation_time_ms INTEGER,
        cost_estimate REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
        UNIQUE (story_arc_id, episode_number)
      );
    `);
    console.log('  ✅ Created story_episodes table');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('  ⏭️  story_episodes table already exists');
    } else {
      console.error('  ❌ Error creating story_episodes table:', error.message);
      throw error;
    }
  }

  // Create indexes for performance
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_story_arcs_user_id ON story_arcs(user_id);
      CREATE INDEX IF NOT EXISTS idx_story_arcs_status ON story_arcs(status);
      CREATE INDEX IF NOT EXISTS idx_story_episodes_arc_id ON story_episodes(story_arc_id);
      CREATE INDEX IF NOT EXISTS idx_story_episodes_delivered_at ON story_episodes(delivered_at);
    `);
    console.log('  ✅ Created indexes');
  } catch (error: any) {
    console.error('  ❌ Error creating indexes:', error.message);
  }

  console.log('✅ Migration complete!');
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Remove story arcs system...');

  try {
    db.exec(`DROP INDEX IF EXISTS idx_story_episodes_delivered_at;`);
    db.exec(`DROP INDEX IF EXISTS idx_story_episodes_arc_id;`);
    db.exec(`DROP INDEX IF EXISTS idx_story_arcs_status;`);
    db.exec(`DROP INDEX IF EXISTS idx_story_arcs_user_id;`);
    db.exec(`DROP TABLE IF EXISTS story_episodes;`);
    db.exec(`DROP TABLE IF EXISTS story_arcs;`);
    console.log('✅ Rollback complete');
  } catch (error: any) {
    console.error('❌ Error during rollback:', error.message);
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('\n✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
