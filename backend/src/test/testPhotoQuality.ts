import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { queryGet } from '../models/database';
import { photoQualityAnalyzer } from '../services/photoQualityAnalyzer';

async function testPhotoQualityAnalysis() {
  console.log('🧪 Testing Photo Quality Analyzer...\n');

  // Get user with photo from database
  const user = queryGet(`
    SELECT id, gender, genre_preference, emotion_preference,
           (SELECT photo_url FROM user_photos WHERE user_id = users.id AND is_active = 1 LIMIT 1) as photo_url
    FROM users
    WHERE id = '1821952e-83b1-4931-82e4-34d893e12fa0'
  `);

  if (!user) {
    console.error('❌ User not found');
    return;
  }

  const photoUrl = user.photo_url as string;

  if (!photoUrl) {
    console.error('❌ User has no photo. Please upload a photo first.');
    console.log('\n💡 You can test with any photo URL by modifying this test script.');
    return;
  }

  console.log('👤 User:', {
    id: (user.id as string)?.substring(0, 8) + '...',
    gender: user.gender,
    hasPhoto: true
  });

  console.log('\n📸 Photo URL:', photoUrl.substring(0, 60) + '...');

  console.log('\n' + '='.repeat(60));
  console.log('📋 Photo Requirements');
  console.log('='.repeat(60));
  const requirements = photoQualityAnalyzer.getPhotoRequirements();
  requirements.forEach(req => console.log('  ' + req));

  console.log('\n' + '='.repeat(60));
  console.log('🔍 Running Quality Analysis...');
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    const analysis = await photoQualityAnalyzer.analyzePhotoQuality(photoUrl);

    const elapsed = Date.now() - startTime;

    console.log('\n✅ Analysis Complete!');
    console.log('\n📊 Results:');
    console.log('  Acceptable:', analysis.isAcceptable ? '✅ YES' : '❌ NO');
    console.log('  Score:', analysis.score + '/100');
    console.log('  Time:', elapsed + 'ms');

    console.log('\n📐 Metadata:');
    console.log('  Resolution:', `${analysis.metadata.width}x${analysis.metadata.height}`);
    console.log('  Format:', analysis.metadata.format);
    console.log('  Size:', (analysis.metadata.fileSize / 1024).toFixed(1) + 'KB');
    console.log('  Faces:', analysis.metadata.faceCount);
    if (analysis.metadata.detectedEmotion) {
      console.log('  Emotion:', analysis.metadata.detectedEmotion);
    }

    if (analysis.issues.length > 0) {
      console.log('\n⚠️  Issues:');
      analysis.issues.forEach((issue, i) => {
        const icon = issue.severity === 'critical' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
    } else {
      console.log('\n✅ No issues detected!');
    }

    if (analysis.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      analysis.suggestions.forEach((suggestion, i) => {
        console.log(`  ${i + 1}. ${suggestion}`);
      });
    }

    // Test quick check
    console.log('\n' + '='.repeat(60));
    console.log('⚡ Testing Quick Check...');
    console.log('='.repeat(60));

    const quickStart = Date.now();
    const isGood = await photoQualityAnalyzer.quickPhotoCheck(photoUrl);
    const quickElapsed = Date.now() - quickStart;

    console.log(`  Result: ${isGood ? '✅ Acceptable' : '❌ Not acceptable'}`);
    console.log(`  Time: ${quickElapsed}ms`);

    // Show common issues
    console.log('\n' + '='.repeat(60));
    console.log('📚 Common Photo Issues & Solutions');
    console.log('='.repeat(60));
    const commonIssues = photoQualityAnalyzer.getCommonIssues();
    commonIssues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.problem}`);
      console.log(`   💡 ${issue.solution}`);
    });

  } catch (error: any) {
    console.error('\n❌ Analysis Failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 Test Complete!');
  console.log('='.repeat(60));
}

// Test with sample photos
async function testWithSamplePhotos() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing with Sample Photo URLs...');
  console.log('='.repeat(60));

  // Test with different types of photos (these are example URLs)
  const testPhotos: { url: string; label: string }[] = [
    // You can add test URLs here
    // { url: 'https://example.com/photo1.jpg', label: 'Clear face photo' },
    // { url: 'https://example.com/photo2.jpg', label: 'Multiple faces' },
  ];

  if (testPhotos.length === 0) {
    console.log('⚠️  No sample photos configured. Add test URLs to the script.');
    return;
  }

  for (const testPhoto of testPhotos) {
    console.log(`\n📸 Testing: ${testPhoto.label}`);
    console.log(`   URL: ${testPhoto.url.substring(0, 50)}...`);

    try {
      const analysis = await photoQualityAnalyzer.analyzePhotoQuality(testPhoto.url);
      console.log(`   Result: ${analysis.isAcceptable ? '✅ Pass' : '❌ Fail'} (${analysis.score}/100)`);
    } catch (error: any) {
      console.log(`   Error: ${error.message}`);
    }
  }
}

testPhotoQualityAnalysis().catch(console.error);
testWithSamplePhotos().catch(console.error);
