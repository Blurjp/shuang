import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

import { queryGet } from '../models/database';
import { imageGeneratorV2 } from '../services/imageGeneratorV2';
import { analyzeStory } from '../services/sceneGenerator';

async function testImageGeneration() {
  console.log('🧪 Testing imageGeneratorV2...\n');

  // Get user with photo
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

  console.log('👤 User:', {
    id: (user.id as string)?.substring(0, 8) + '...',
    gender: user.gender,
    genre: user.genre_preference,
    emotion: user.emotion_preference,
    hasPhoto: !!(user.photo_url as string)
  });

  if (!(user.photo_url as string)) {
    console.error('❌ User has no photo');
    return;
  }

  // Sample story for testing
  const story = `会议室内气氛凝重，投影幕上的数据图表在冷色调灯光下显得格外刺眼。坐在对面的投资方代表推了推金丝眼镜，嘴角挂着一丝若有若无的嘲讽："他觉得，凭他的资历能看懂这份财报吗？"

你没有立刻回应，只是平静地翻开面前的文件，修长的手指在关键数据上轻轻划过。"确实，以我过去的资历，可能不够格。"你抬起头，目光清明如镜，"但您刚才引用的这三组数据，恰好是我三年前主导的项目。其中第17页的ROI计算，第23页的市场渗透率预测，还有第31页的风险评估模型——每一个数字，都是我熬了无数个通宵反复验证出来的。"

会议室里突然安静下来。你站起身，走到投影幕前，用激光笔精准地点出几个关键节点。"您质疑的第17页，实际上用的是保守估计。真实数据比这个高出15%。第23页的市场预测，我们已经提前半年完成了。至于风险评估..."你微微一笑，"今年零重大失误，这在行业内是个什么水平，您应该清楚。"

坐回位置时，你听到了会议室后排传来的轻微倒吸冷气声。那个投资方代表的脸色变了又变，最终化作一种复杂的敬佩。"看来是我有眼不识泰山。"他放下傲慢的姿态，语气变得谦卑。

你只是淡淡地点头，心里却清楚：这场较量，从他开口的那一刻起，胜负就已经注定了。实力，从来不需要大声喧哗。`;

  console.log('\n📝 Story sample:', story.substring(0, 100) + '...');

  // Generate scene from story
  const analysis = analyzeStory(story);
  const scene = analysis.suggestedScene;

  console.log('\n🎭 Generated Scene:');
  console.log('  Description:', scene.description);
  console.log('  Camera:', scene.camera.shot, '-', scene.camera.angle);
  console.log('  Lighting:', scene.lighting.type);
  console.log('  Environment:', scene.environment.substring(0, 60) + '...');

  // Generate image
  console.log('\n🎨 Starting image generation...');
  console.log('⏱️  This may take 1-3 minutes...\n');

  const startTime = Date.now();

  try {
    const result = await imageGeneratorV2.generatePersonalizedImage({
      userPhotoUrl: user.photo_url as string,
      scene: scene,
      gender: (user.gender as 'male' | 'female') || 'male'
    });

    const elapsed = Date.now() - startTime;

    console.log('\n✅ SUCCESS! Image generated!');
    console.log('\n📊 Results:');
    console.log('  Provider:', result.provider);
    console.log('  Time:', (elapsed / 1000).toFixed(1) + 's');
    console.log('  Cost: $' + (result.costEstimate || 'unknown'));
    console.log('\n🖼️  Image URL:', result.imageUrl);

    // Get metrics
    const metrics = imageGeneratorV2.getMetrics();
    console.log('\n📈 Provider Metrics:');
    metrics.forEach(m => {
      console.log(`  ${m.provider}: ${m.successCount} success, ${m.failureCount} failure, avg ${m.avgGenerationTime.toFixed(0)}ms`);
    });

  } catch (error: any) {
    console.error('\n❌ FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImageGeneration().catch(console.error);
