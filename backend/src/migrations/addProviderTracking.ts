/**
 * Migration: Add Provider Tracking to daily_contents
 *
 * This migration adds columns to track which AI providers were used
 * for story and image generation, along with performance metrics.
 *
 * Columns added to daily_contents:
 * - story_provider: 'claude' | 'openai' | null
 * - image_provider: 'replicate' | 'openai' | null
 * - story_generation_time_ms: Time taken to generate story
 * - image_generation_time_ms: Time taken to generate image
 * - cost_estimate: Estimated cost in USD
 * - scene_description: Scene description used for image generation
 */

import { db } from '../models/database';

export async function up(): Promise<void> {
  console.log('🔄 Running migration: Add provider tracking...');

  try {
    // Add story_provider column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN story_provider TEXT;
    `);
    console.log('  ✅ Added story_provider column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  story_provider column already exists');
    } else {
      console.error('  ❌ Error adding story_provider:', error.message);
    }
  }

  try {
    // Add image_provider column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN image_provider TEXT;
    `);
    console.log('  ✅ Added image_provider column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  image_provider column already exists');
    } else {
      console.error('  ❌ Error adding image_provider:', error.message);
    }
  }

  try {
    // Add story_generation_time_ms column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN story_generation_time_ms INTEGER;
    `);
    console.log('  ✅ Added story_generation_time_ms column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  story_generation_time_ms column already exists');
    } else {
      console.error('  ❌ Error adding story_generation_time_ms:', error.message);
    }
  }

  try {
    // Add image_generation_time_ms column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN image_generation_time_ms INTEGER;
    `);
    console.log('  ✅ Added image_generation_time_ms column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  image_generation_time_ms column already exists');
    } else {
      console.error('  ❌ Error adding image_generation_time_ms:', error.message);
    }
  }

  try {
    // Add cost_estimate column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN cost_estimate REAL;
    `);
    console.log('  ✅ Added cost_estimate column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  cost_estimate column already exists');
    } else {
      console.error('  ❌ Error adding cost_estimate:', error.message);
    }
  }

  try {
    // Add scene_description column
    db.exec(`
      ALTER TABLE daily_contents ADD COLUMN scene_description TEXT;
    `);
    console.log('  ✅ Added scene_description column');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      console.log('  ⏭️  scene_description column already exists');
    } else {
      console.error('  ❌ Error adding scene_description:', error.message);
    }
  }

  console.log('✅ Migration complete!');
}

export async function down(): Promise<void> {
  console.log('🔄 Rolling back migration: Remove provider tracking...');

  // Note: SQLite doesn't support DROP COLUMN directly
  // To rollback, we would need to recreate the table without these columns
  // For now, this is a no-op

  console.log('⚠️  Rollback not supported for SQLite (would require table recreation)');
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
