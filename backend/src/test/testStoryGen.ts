import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { queryGet } from '../models/database';
import { generateStory as generateStoryV2 } from '../services/storyGeneratorV2';
import type { FeedbackInsights } from '../services/storyGeneratorV2';

async function testStoryGeneration() {
  console.log('🧪 Testing storyGeneratorV2...\n');

  // Get user from database
  const user = queryGet(`
    SELECT id, gender, genre_preference, emotion_preference
    FROM users
    WHERE id = '1821952e-83b1-4931-82e4-34d893e12fa0'
  `);

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  console.log('👤 User:', {
    id: (user.id as string)?.substring(0, 8) + '...',
    gender: user.gender,
    genre: user.genre_preference,
    emotion: user.emotion_preference
  });

  // Test different genre/emotion combinations
  const testCases = [
    { genre: 'business', emotion: 'revenge', label: '商战 + 复仇' },
    { genre: 'modern', emotion: 'favored', label: '现代 + 宠溺' },
    { genre: 'urban', emotion: 'satisfaction', label: '都市 + 满足' },
    { genre: 'fantasy', emotion: 'revenge', label: '奇幻 + 复仇' },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Test Case: ${testCase.label}`);
    console.log('='.repeat(60));

    const startTime = Date.now();

    try {
      const result = await generateStoryV2({
        gender: (user.gender as 'male' | 'female') || 'male',
        genre: testCase.genre as any,
        emotion: testCase.emotion as any,
      });

      const elapsed = Date.now() - startTime;

      console.log('\n✅ SUCCESS! Story generated!');
      console.log('\n📊 Results:');
      console.log('  Provider:', result.provider);
      console.log('  Time:', (elapsed / 1000).toFixed(1) + 's');
      console.log('  Scene:', result.sceneDescription);

      console.log('\n📖 Story:');
      console.log('─'.repeat(60));
      console.log(result.story);
      console.log('─'.repeat(60));

      // Add delay between tests to avoid rate limits
      if (testCases.indexOf(testCase) < testCases.length - 1) {
        console.log('\n⏳ Waiting 3 seconds before next test...\n');
        await sleep(3000);
      }

    } catch (error: any) {
      console.error('\n❌ FAILED:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 All tests completed!');
  console.log('='.repeat(60));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testStoryGeneration().catch(console.error);
