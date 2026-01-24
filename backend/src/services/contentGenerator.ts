import { User } from '../models/database';
import { analyzeStory, Scene } from './sceneGenerator';
import { openaiImageEditService } from './openaiImageEdit';
import { getPersonalizedSuggestions } from './feedbackAnalyzer';
import { imageGeneratorV2, type ImageGenerationResult } from './imageGeneratorV2';
import { generateStory as generateStoryV2 } from './storyGeneratorV2';
import type { FeedbackInsights } from './storyGeneratorV2';

// ============================================
// Type Definitions for Provider Tracking
// ============================================

export interface StoryGenerationResult {
  story: string;
  provider: 'claude' | 'openai' | 'fallback';
  generationTimeMs: number;
  sceneDescription: string;
}

export interface ImageGenerationResultWithInfo extends ImageGenerationResult {
  sceneDescription: string;
}

/**
 * Extract actual URL from photo_url field which can be:
 * 1. Direct URL (Cloudinary/R2)
 * 2. Base64 data URL
 * 3. JSON string with Photo Library asset info
 *
 * Also applies Cloudinary transformations for size optimization
 */
function extractPhotoUrl(photoUrl: string): string | null {
  if (!photoUrl) return null;

  let actualUrl: string | null = null;

  // Already a valid http(s) URL
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    actualUrl = photoUrl;
  }

  // Base64 data URL (not suitable for download)
  else if (photoUrl.startsWith('data:')) {
    return null; // Can't use base64 for OpenAI Image Edit API
  }

  // Try to parse as JSON (iOS Photo Library format)
  else {
    try {
      const parsed = JSON.parse(photoUrl);
      if (parsed.type === 'base64' && parsed.source?.type === 'url' && parsed.source?.url) {
        actualUrl = parsed.source.url;
      }
    } catch (e) {
      // Not JSON, return as-is
      actualUrl = photoUrl;
    }
  }

  if (!actualUrl) return null;

  // For Cloudinary URLs, add transformations to optimize size
  // Resize to 512x512 for cost savings (mobile display), use quality 80
  if (actualUrl.includes('cloudinary.com')) {
    const url = new URL(actualUrl);
    // Add Cloudinary transformations
    // q_80: quality 80%
    // c_limit,w_512,h_512: resize to max 512x512 maintaining aspect ratio
    // fl_png8: force PNG8 format with alpha channel (RGBA)
    const transform = 'q_80,c_limit,w_512,h_512,fl_png8';
    // Insert transformation after /upload/ and before version (vXXX)
    const pathname = url.pathname;
    const uploadIndex = pathname.indexOf('/upload/');
    if (uploadIndex !== -1) {
      const beforeUpload = pathname.substring(0, uploadIndex + 8); // '/upload/' is 8 chars
      const afterUpload = pathname.substring(uploadIndex + 8);
      // Check if there's already a transformation (starts with vXXX or doesn't start with v_)
      if (afterUpload.match(/^v\d+/)) {
        // Format: /upload/v1234/... -> /upload/q_80,c_limit,w_1024,h_1024,fl_png8/v1234/...
        url.pathname = `${beforeUpload}${transform}/${afterUpload}`;
        return url.toString();
      } else if (!afterUpload.startsWith('q_')) {
        // No transformation yet, insert it
        url.pathname = `${beforeUpload}${transform}/${afterUpload}`;
        return url.toString();
      }
    }
  }

  return actualUrl;
}

export class ContentGenerator {
  private llmApiKey: string;
  private llmApiUrl: string;
  private imageApiKey: string;
  private imageApiUrl: string;

  constructor() {
    // Read from env at runtime, not at instantiation
    this.llmApiKey = process.env.LLM_API_KEY || '';
    this.llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.imageApiKey = process.env.IMAGE_API_KEY || '';
    this.imageApiUrl = process.env.IMAGE_API_URL || '';
  }

  // Helper method to refresh env vars (call this if env changes)
  private reloadEnv() {
    this.llmApiKey = process.env.LLM_API_KEY || '';
    this.llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.imageApiKey = process.env.IMAGE_API_KEY || '';
    this.imageApiUrl = process.env.IMAGE_API_URL || '';
  }

  /**
   * Generate sophisticated story text using Claude (primary) or OpenAI (fallback)
   * Uses storyGeneratorV2 with comprehensive 爽文 templates
   * Uses feedback-based personalization if available
   *
   * @returns StoryGenerationResult with story, provider, timing, and scene description
   */
  async generateStoryWithMetadata(user: User): Promise<StoryGenerationResult> {
    // Reload environment variables to ensure we have the latest values
    this.reloadEnv();

    // Try to get personalized suggestions based on user's feedback history
    let feedbackInsights: FeedbackInsights | undefined;
    try {
      const suggestions = await getPersonalizedSuggestions(user.id);
      if (suggestions.genre && suggestions.confidence >= 0.6) {
        console.log(`🎯 Using feedback-based personalization (confidence: ${suggestions.confidence.toFixed(2)})`);
        console.log(`   Genre: ${user.genre_preference} → ${suggestions.genre}`);
        if (suggestions.emotion) {
          console.log(`   Emotion: ${user.emotion_preference} → ${suggestions.emotion}`);
        }
        // Build feedback insights for storyGeneratorV2
        feedbackInsights = {
          likePercentage: suggestions.confidence,
          preferredElements: suggestions.genre ? [suggestions.genre] : [],
          avoidElements: []
        };
      }
    } catch (error) {
      console.warn('Could not get personalized suggestions, using default preferences');
    }

    try {
      console.log(`📖 Generating story with storyGeneratorV2 (Claude primary, OpenAI fallback)...`);

      const result = await generateStoryV2({
        gender: (user.gender as 'male' | 'female') || 'male',
        genre: (user.genre_preference as any) || 'modern',
        emotion: (user.emotion_preference as any) || 'satisfaction',
        feedbackInsights
      });

      console.log(`✅ Story generated successfully!`);
      console.log(`📊 Provider: ${result.provider}`);
      console.log(`⏱️  Generation time: ${result.generationTimeMs}ms`);
      console.log(`🎭 Scene: ${result.sceneDescription}`);

      return {
        story: result.story,
        provider: result.provider,
        generationTimeMs: result.generationTimeMs,
        sceneDescription: result.sceneDescription,
      };
    } catch (error) {
      console.error('❌ storyGeneratorV2 failed, using fallback story:', error);
      // Return a fallback story with metadata
      const fallbackStory = this.generateFallbackStory(user);
      return {
        story: fallbackStory,
        provider: 'fallback',
        generationTimeMs: 0,
        sceneDescription: 'Fallback story - no scene available',
      };
    }
  }

  /**
   * Generate story text only (backward compatibility)
   */
  async generateStory(user: User): Promise<string> {
    const result = await this.generateStoryWithMetadata(user);
    return result.story;
  }

  /**
   * Fallback to gpt-3.5-turbo if primary model fails
   */
  private async generateWithGPT35(user: User): Promise<string> {
    const prompt = this.buildPrompt(user);

    const response = await fetch(this.llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      throw new Error(`GPT-3.5 fallback failed: ${response.status}`);
    }

    const data = await response.json() as any;
    const text = data.choices[0].message.content.trim();
    const cleanText = text.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

    return cleanText;
  }

  /**
   * Get sophisticated system prompt for quality story generation
   */
  private getSystemPrompt(): string {
    return `你是一位成熟的都市小说作家，擅长创作细腻、有深度、引人入胜的都市爽文。

你的写作特点：
1. 文笔成熟，用词精准，避免幼稚和简单化的表达
2. 善于描绘细微的心理变化和情感层次
3. 情节张弛有度，既有紧张冲突，也有细腻的情感刻画
4. 人物立体饱满，不是简单的符号化角色
5. 环境描写生动，营造出强烈的代入感和画面感
6. 对话自然流畅，符合人物身份和情境
7. 节奏把控到位，有铺垫、有高潮、有余韵

你的故事应该：
- 长度在400-600字之间（不要太短，要有完整的情节展开）
- 以第二人称"你"叙述，增强代入感
- 有明确的情节线和情感弧光
- 有细节、有层次、有韵味
- 避免流水账，要有戏剧性和感染力
- 让读者读完后感到畅快、满足、回味无穷`;
  }

  /**
   * Build the prompt based on user preferences
   * Updated with sophisticated writing requirements
   */
  private buildPrompt(user: User): string {
    const genderMap: Record<string, string> = {
      male: '男性',
      female: '女性'
    };

    // Map genres to sophisticated themes
    const genreMap: Record<string, string> = {
      modern: '职场商战 - 商场如战场，一步错满盘皆输，但也充满翻盘的机会',
      ancient: '现代都市 - 在繁华都市中奋斗，见证人生百态与个人成长',
      fantasy: '都市逆袭 - 从低谷走向巅峰，用实力和智慧改变命运',
      urban: '都市风云 - 城市生活的复杂纠葛，人际网络中的博弈与成长',
      business: '商界纵横 - 商业帝国的崛起，权力、财富、欲望的交织'
    };

    // Map emotions to sophisticated themes
    const emotionMap: Record<string, string> = {
      favored: '被珍视的温暖 - 权势巅峰处的一抹柔情，在激烈竞争中获得真挚的情感',
      revenge: '雷霆反击 - 曾被轻视、被低估，如今让所有人见识真正的实力',
      satisfaction: '登峰造极 - 经历重重考验，终于站在了人生的高峰',
      growth: '破茧成蝶 - 在磨难中成长，在挑战中蜕变，成为更好的自己'
    };

    const genderKey = user.gender || 'male';
    const genreKey = user.genre_preference || 'modern';
    const emotionKey = user.emotion_preference || 'satisfaction';

    const gender = genderMap[genderKey] || genderMap['male'];
    const genre = genreMap[genreKey] || genreMap['modern'];
    const emotion = emotionMap[emotionKey] || emotionMap['satisfaction'];

    return `请创作一篇400-600字的都市爽文片段，具体要求：

【基础设定】
- 主角性别：${gender}
- 题材类型：${genre}
- 情感基调：${emotion}

【写作要求】
1. 第二人称"你"叙述，让读者完全沉浸其中
2. 文笔成熟细腻，避免简单直白的表述
3. 有完整的情节发展：开场铺垫 → 冲突/转折 → 高潮 → 余韵
4. 注重细节描写：神态、动作、环境、心理都要有层次感
5. 对话要符合情境和人物身份，推动情节发展
6. 营造强烈的画面感和代入感
7. 张弛有度，既有紧张的冲突，也有细腻的情感刻画
8. 结尾要有余韵，让读者回味无穷

【情节建议】
- 可以是职场商战中的关键对峙时刻
- 可以是人生转折点的重要抉择
- 可以是证明自己的高光时刻
- 可以是情感与理性的激烈碰撞
- 可以是从被质疑到被仰视的逆袭过程

【风格要求】
- 成熟、精致、有文学性
- 有爽点但不俗套，有深度但不晦涩
- 让读者在阅读中获得情感满足和精神愉悦

请直接输出故事内容，不要标题，不要前言。`;
  }

  /**
   * Generate fallback story when API fails
   * Sophisticated stories with depth and nuance
   */
  private generateFallbackStory(user: User): string {
    const isMale = user.gender === 'male';
    const he = isMale ? '他' : '她';
    const him = isMale ? '他' : '她';
    const his = isMale ? '他的' : '她的';

    const templates = [
      // 商战反击 - Sophisticated business counterattack
      `会议室内气氛凝重，投影幕上的数据图表在冷色调灯光下显得格外刺眼。坐在对面的投资方代表推了推金丝眼镜，嘴角挂着一丝若有若无的嘲讽："${he}觉得，凭${his}资历能看懂这份财报吗？"

你没有立刻回应，只是平静地翻开面前的文件，修长的手指在关键数据上轻轻划过。"确实，以我过去的资历，可能不够格。"你抬起头，目光清明如镜，"但您刚才引用的这三组数据，恰好是我三年前主导的项目。其中第17页的ROI计算，第23页的市场渗透率预测，还有第31页的风险评估模型——每一个数字，都是我熬了无数个通宵反复验证出来的。"

会议室里突然安静下来。你站起身，走到投影幕前，用激光笔精准地点出几个关键节点。"您质疑的第17页，实际上用的是保守估计。真实数据比这个高出15%。第23页的市场预测，我们已经提前半年完成了。至于风险评估..."你微微一笑，"今年零重大失误，这在行业内是个什么水平，您应该清楚。"

坐回位置时，你听到了会议室后排传来的轻微倒吸冷气声。那个投资方代表的脸色变了又变，最终化作一种复杂的敬佩。"看来是我有眼不识泰山。"${he}放下傲慢的姿态，语气变得谦卑。

你只是淡淡地点头，心里却清楚：这场较量，从${he}开口的那一刻起，胜负就已经注定了。实力，从来不需要大声喧哗。`,

      // 职场逆袭 - Workplace redemption
      `三年前的那个下午，你抱着纸箱走出公司大门时，前台小姑娘同情的眼神至今还清晰如昨。那时，所有人都说你是被淘汰的失败者，连最好的朋友都为你感到惋惜。

今天，当你以战略合作伙伴的身份重新踏入这栋大楼时，前台早就换成了新面孔。你穿着剪裁得体的深色西装，步伐稳健，眼中再无当年的迷茫与屈辱。

电梯在18层停下，门打开的瞬间，整个办公区突然安静下来。你径直走向会议室，路过那些曾经质疑你、嘲笑你、甚至落井下石的人。${he}们的表情精彩极了——震惊、难以置信、一丝不易察觉的慌乱。

"大家好。"你的声音平静而从容，"我是这次并购案的负责人，接下来三个月，将与大家并肩工作。"

会议室里，当年开除你的总监此刻正尴尬地站在角落，脸涨成了猪肝色。你只是微微颔首，不卑不亢地走向主位。窗外的阳光正好，照亮了你此刻从容淡定的侧脸。

你心中清楚，真正的成功不是证明给别人看，而是终于活成了自己想要的样子。那些曾经的屈辱，如今都化作了你向上攀登的阶梯。每一步，都走得无比踏实。`,

      // 谈判桌上的博弈 - Negotiation table
      `谈判桌上的气氛剑拔弩张，对方代表咄咄逼人的态度让在座的人都为你捏了把汗。"如果不接受这个条款，那这笔交易就此作罢。"${he}合上文件夹，眼神里带着赤裸裸的威胁。

你没有立刻回应，只是慢条斯理地端起茶杯，轻抿了一口。"这样啊。"你放下茶杯，发出一声清脆的声响。然后，你优雅地站起身，整理了一下西装下摆，"那就不耽误各位的时间了。"

就在你的手触碰到会议室门把手的那一刻，会议室外面传来急促的脚步声。对方的董事长亲自赶了过来，额头上还挂着汗珠。"等等！我们 reconsider，您的条件我们全部接受！"

你转过身，脸上挂着得体而疏离的微笑："不好意思，现在是我 reconsider 了。"

整个会议室瞬间死寂。你重新坐回谈判桌的主位，气场全开。所有人都看出来了——从这一刻起，主动权已经彻底易手。这不是运气，不是侥幸，而是你用无数个日夜的专业积累，换来的从容与底气。

谈判继续进行，但这一次，再也没有人敢对你放肆。`,

      // 项目攻坚 - Project breakthrough
      `凌晨两点的办公室，只有你工位上的台灯还亮着。

这个项目的技术难度超出了所有人的预期，团队里最有经验的工程师都摇头说做不到。但你没有放弃，你在所有人怀疑的目光中，默默扛下了这个看似不可能的任务。

键盘的敲击声在空旷的办公室里回响，你的眼睛因为长时间盯着屏幕而布满血丝，但思维却异常清晰。一行行代码在你指尖流淌，一个个难题被你逐一攻克。你甚至忘记了时间，忘记了饥饿，忘记了一切，眼中只有那个待解决的问题。

当第一缕晨光透过落地窗照进来时，你终于敲下了最后一个键。

测试通过。

你靠在椅背上，长长地舒了一口气。那种成就感，比任何赞美都来得踏实。当天早上，当你的解决方案在大屏幕上展示时，整个技术部都炸锅了。首席工程师激动地握住你的手，语无伦次地说着"天才"、"不可思议"。

看着周围同事们崇拜的眼神，那个平时总爱显摆、从来看不起你的同事此刻彻底哑火了。你只是轻描淡写地说："也就那样吧，换个人也能做出来。"

但只有你自己知道，这句话背后的分量。多少个不眠之夜，多少次推翻重来，多少次在崩溃的边缘咬牙坚持——这些，没有人看见，也不需要别人看见。

真正的实力，从来不需要大肆宣扬。`,

      // 地位反转 - Status reversal
      `五年前，你还是那个在公司里跑腿的小助理，买咖啡都要看人脸色。那年冬天，你在CBD的一家高端咖啡厅，因为排在了某位"重要人物"后面，被店经理当众请到一边等候。你手里捏着皱巴巴的二十块钱，站在角落，看着那些衣着光鲜的人谈笑风生，心里发誓：总有一天，我会堂堂正正地走进这里。

今天，你作为集团执行副总，再次走进这家咖啡厅。

刚进门，经理就认出了你——不是从那张曾经卑微的脸，而是从上周财经杂志的封面。${he}几乎是小跑着过来，腰弯成了九十度："${isMale ? '总' : '总'}！您来了！今天还点和以前一样的吗？"

你微笑着摇头："今天我想试试新品。"

"好的好的！马上给您准备！"经理转身吩咐下去，整个咖啡厅的服务员都围着你转。曾经那些对你爱理不理的同事，如今见你都要恭敬地打招呼，甚至还有人排队来巴结你。

你坐在靠窗的VIP位置，端着精致的白瓷咖啡杯，看着窗外川流不息的人群。玻璃上倒映着你此刻从容淡定的侧脸，那个曾经卑微瑟缩的影子，早已消失不见。

这时，那个当年让你"靠边站"的经理小心翼翼地凑过来："${isMale ? '总' : '姐'}，您看还有什么需要改进的吗？"

你放下杯子，语气平和而坚定："不用了。你现在的服务就很好。"然后你顿了顿，"不过，记住：每一位走进这里的顾客，都值得被尊重。不管${he}是谁。"

经理愣了一下，随即连连点头称是。

你喝完最后一口咖啡，优雅地起身离开。推门而出的瞬间，初冬的阳光洒在你身上，温暖而明亮。这就是逆袭的滋味——不是报复的快感，而是活成自己想成为的模样。`,

      // 宴会打脸 - Banquet face slap
      `晚宴现场衣香鬓影，觥筹交错间暗流涌动。

你穿着低调而剪裁考究的深色礼服，端着香槟站在角落，不主动与人寒暄，但气场却让人无法忽视。不远处，几个曾经的"老朋友"正在窃窃私语，眼神时不时扫向你，带着几分嘲弄和幸灾乐祸。

"听说${he}那个项目黄了？"有人刻意压低声音，但音量恰好能让你听见。

"可不是嘛，我就说${he}不行，当初${he}那个提案就被所有人批得体无完肤。"另一个人附和着，脸上挂着得意的笑。

你抿了一口香槟，没有理会。这种程度的挑衅，早已不值得你浪费情绪。

就在这时，宴会厅的大门被推开，主办方的高层神色匆匆地走了进来。${he}环视全场，目光最终锁定在你身上，快步走来。

"可算找到您了！"对方的语气里满是焦急和尊敬，"上次您提的那个战略方案，董事会讨论通过了，全票通过！现在全公司都在按您的蓝图推进，效果超出预期！您真是我们的救星啊！"

整个宴会厅瞬间安静下来。那些窃窃私语的人此刻脸上的表情精彩极了——震惊、尴尬、不知所措。

你放下香槟，礼貌而疏离地微笑："过奖了，只是尽我所能而已。"

"哪里哪里！您太谦虚了！"对方激动得搓着手，"对了，还有个重要消息要宣布——鉴于您在上个项目中的卓越表现，董事会一致决定，聘请您担任首席战略顾问！"

这一刻，所有人的目光都集中在你身上——震惊、羡慕、敬畏。而那些刚才还在嘲笑你的人，此刻只能把头埋得更低，恨不得找个地缝钻进去。

你依然保持着得体的微笑，心里却清楚：这不是打脸，这只是——实力说话。`,

      // 被珍视的温暖 - Being cherished
      `暴雨夜，你被困在公司楼下的咖啡厅，手机已经没电，周围也没有可以叫车的软件。你坐在窗边，看着外面瓢泼的大雨，心里盘算着要不要冒雨冲去地铁站。

就在这时，一把黑伞突然出现在你的视野里。你抬头，发现是那个传说中雷厉风行、在商界叱咤风云的人。

"${isMale ? '他' : '她'}怎么会在这里？"你心里闪过一丝惊讶。

"我的司机在楼下。"${he}的声音低沉而温和，与你在新闻里看到的那个冷酷霸主形象判若两人，"送你一程？"

你本想婉拒，但${he}眼神里的真诚让你说不出口。车厢内，暖气开得很足，${he}递给你一条温热的毛巾："擦擦脸吧，淋湿了会感冒。"

你没有矫情，接过毛巾擦了擦脸上的雨水。

"饿不饿？"${he}突然问，"我让阿姨准备了姜汤和点心。"

你愣住了。这个在谈判桌上从不让步、在商战中从不手软的人，此刻却像个普通人一样，细心周到地照顾着你。

"为什么？"你忍不住问道，"你明明没必要..."

"有必要。"${he}打断了你，语气不容置疑，"在外面，你是别人眼中的合作伙伴、竞争对手、或者无关紧要的路人。但在我这里，你只是你。而在我这里的人，我不会让${he}淋雨，不会让${he}饿肚子，更不会让${he}受委屈。"

你的心突然像是被什么东西轻轻撞了一下。你一直以为${he}是个冷血动物，没想到，在${his}坚硬的外壳下，藏着这样细腻温柔的一面。

那一晚的姜汤很暖，点心很甜，而${he}看你的眼神，让你第一次真切地感受到了被珍视的滋味。

原来，在权势和利益的顶峰，还有这样一抹柔情，只为你一人而留。`,

      // 登峰造极 - Reaching the peak
      `颁奖典礼现场，镁光灯闪烁，你穿着剪裁完美的礼服，从容地走上领奖台。

台下坐着商界的精英、媒体的名记、还有那些曾经质疑你、轻视你、甚至与你为敌的人。此刻，${he}们都在为你鼓掌，眼神里带着复杂的情绪——敬佩、羡慕、嫉妒，还有一丝不易察觉的后悔。

主持人激动地宣布："本届年度商业领袖——${he}就是以黑马之姿，在短短三年内将公司从濒临破产带到行业巅峰的${isMale ? '先生' : '女士'}！"

雷鸣般的掌声响起。你接过奖杯，转身面向台下。聚光灯打在你身上，你从容淡定，脸上挂着得体的微笑，看不出半分骄傲自满。

但只有你自己知道，为了这一刻，你付出了什么。

无数个不眠之夜，无数次被质疑后的咬牙坚持，无数次在崩溃边缘的自我救赎。你曾被人指着鼻子骂"不知天高地厚"，曾被合作伙伴在最后一刻背弃，曾因资金链断裂而整夜失眠。但每一次，你都挺过来了。

你站在领奖台上，目光扫过台下一张张熟悉或陌生的面孔。那个当年说你"永远成不了气候"的前上司，此刻正尴尬地避开你的眼神；那个曾经抢你功劳的前同事，现在只能坐在后排仰视你；那些曾经看不起你的人，如今都要为你鼓掌。

你轻轻举起奖杯，声音平静而有力："这个奖，不属于我一个人。它属于所有在逆境中依然坚持的人，属于所有被质疑后依然不放弃的人，属于所有相信自己、并为之拼尽全力的人。"

台下的掌声更加热烈了。

你微笑着鞠躬致意，心里却无比清楚：这不是终点，这只是新的起点。真正的强者，永远不会被荣誉困住，而是会带着这份认可，继续向下一个高峰攀登。

因为你知道，还有更广阔的天地，等着你去征服。`,

      // 破茧成蝶 - Metamorphosis
      `一年前，你是个在团队里默默无闻的小透明。开会时坐在角落，发言时声音小得几乎听不见，提案时紧张得手心冒汗。同事们在群里讨论方案，你想了很久才敢发一条建议，还立刻被人怼了回来："你懂什么？"

那时的你，自卑、怯懦，总觉得自己不够好，不够格。

但你没有放弃。你开始疯狂地学习——白天工作，晚上上在线课程，周末参加行业讲座。你逼着自己去尝试那些让你害怕的事情：主动发言、独立带项目、在重要会议上做presentation。

第一次独立提案时，你的声音在发抖，手心全是汗。但你坚持讲完了，虽然不够完美，但你做到了。

第二次，你的声音稳了一些，眼神也不再躲闪。

第三次，第四次...

渐渐地，同事们的眼神变了。从最初的轻视、不耐烦，变成了惊讶、认可，最后变成了尊重。

今天，你站在会议室的主位上，从容地分享着你的最新方案。你的声音清晰有力，你的逻辑严密透彻，你的风度自信优雅。台下的人专注地听着，不时点头赞同，有人在做笔记，有人投来崇拜的眼神。

当你说完最后一句话时，会议室里爆发出热烈的掌声。那个曾经怼你的同事，此刻真诚地说："你现在的水平，已经远超我们所有人了。"

你微笑着说："谢谢，我只是努力不让自己停下脚步。"

其实只有你自己知道，这句话背后是多少个夜晚的崩溃和重塑。你从一个胆小怯懦的小透明，蜕变成了今天这个从容自信、受人尊敬的专业人士。

这不是魔法，不是奇迹，这是用无数个日夜的汗水和泪水换来的。

你站在会议室的主位上，看着窗外的蓝天，心里无比清楚：只要你不放弃自己，就没有什么能打倒你。每一个曾经让你痛苦的经历，最终都会成为你向上攀登的阶梯。

这就是成长的意义——不是成为别人眼中的完美，而是成为你自己想成为的模样。`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate image using Scene-based approach with Multi-Provider strategy
   * Priority: Replicate PhotoMaker (primary) > OpenAI gpt-image-1 (fallback) > DALL-E 3 (last resort)
   *
   * @returns ImageGenerationResultWithInfo with imageUrl, provider, timing, and cost
   */
  async generateImageWithMetadata(storyText: string, user: User, userPhotoUrl?: string): Promise<ImageGenerationResultWithInfo> {
    // Reload environment variables
    this.reloadEnv();

    const startTime = Date.now();

    console.log(`🎨 Generating image with Scene-based approach V2...`);
    console.log(`📸 User photo available: ${userPhotoUrl ? 'YES' : 'NO'}`);

    // STEP 1: Analyze story and generate safe scene
    console.log(`\n=== STEP 1: Story → Scene Transformation ===`);
    const analysis = analyzeStory(storyText);

    if (!analysis.suggestedScene.isSafe) {
      console.warn(`⚠️  Story contains unsafe elements: ${analysis.suggestedScene.unsafeReason}`);
      console.warn(`⚠️  Using safe fallback scene instead`);
    }

    const scene = analysis.suggestedScene;
    console.log(`🎭 Scene: ${scene.description}`);
    console.log(`📐 Camera: ${scene.camera.shot}, ${scene.camera.angle}`);
    console.log(`💡 Lighting: ${scene.lighting.type}`);
    console.log(`😊 Emotion: ${scene.emotion}`);

    // STEP 2: Generate image using multi-provider strategy
    console.log(`\n=== STEP 2: Image Generation (V2 with PhotoMaker fallback) ===`);

    const actualPhotoUrl = userPhotoUrl ? extractPhotoUrl(userPhotoUrl) : null;
    console.log(`📸 Reference photo: ${actualPhotoUrl ? actualPhotoUrl.substring(0, 60) + '...' : 'none'}`);

    // Use new imageGeneratorV2 with automatic provider fallback
    if (actualPhotoUrl && analysis.suggestedScene.isSafe) {
      console.log(`✅ Using imageGeneratorV2 (Replicate PhotoMaker > OpenAI gpt-image-1)...`);
      try {
        const userGender = (user.gender as 'male' | 'female') || 'male';
        const result: ImageGenerationResult = await imageGeneratorV2.generatePersonalizedImage({
          userPhotoUrl: actualPhotoUrl,
          scene: scene,
          gender: userGender
        });

        console.log(`✅ Image generated successfully!`);
        console.log(`📊 Provider: ${result.provider}`);
        console.log(`⏱️  Generation time: ${result.generationTimeMs}ms`);
        console.log(`💰 Estimated cost: $${result.costEstimate?.toFixed(4) || 'unknown'}`);

        return {
          ...result,
          sceneDescription: scene.description,
        };
      } catch (error: any) {
        console.error(`❌ imageGeneratorV2 failed:`, error?.message || error);
        // Fall through to DALL-E 3
      }
    }

    // Final fallback to DALL-E 3
    console.log(`🎨 Using DALL-E 3 as final fallback...`);
    try {
      const userGender = (user.gender as 'male' | 'female') || 'male';
      const imageUrl = await this.generateWithDalle3(scene, userGender);
      const duration = Date.now() - startTime;
      console.log(`✅ Image generated with DALL-E 3`);

      return {
        imageUrl,
        provider: 'openai',
        generationTimeMs: duration,
        costEstimate: 0.04, // DALL-E 3 512x512 ~ $0.04
        sceneDescription: scene.description,
      };
    } catch (error) {
      console.error('❌ DALL-E 3 failed:', error);
      console.log(`📦 Using placeholder image`);
      const placeholderUrl = this.getPlaceholderImage(user);
      return {
        imageUrl: placeholderUrl,
        provider: 'openai',
        generationTimeMs: Date.now() - startTime,
        costEstimate: 0,
        sceneDescription: scene.description,
      };
    }
  }

  /**
   * Generate image URL only (backward compatibility)
   */
  async generateImage(storyText: string, user: User, userPhotoUrl?: string): Promise<string> {
    const result = await this.generateImageWithMetadata(storyText, user, userPhotoUrl);
    return result.imageUrl;
  }

  /**
   * Generate image using DALL-E 3 with detailed scene prompt (fallback)
   */
  private async generateWithDalle3(scene: Scene, userGender: 'male' | 'female'): Promise<string> {
    const genderTerm = userGender === 'male' ? 'handsome man' : 'beautiful woman';
    const prompt = `A photorealistic ${scene.camera.shot} photograph of a ${genderTerm} in ${scene.environment}. ${scene.lighting.type} lighting.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IMAGE_API_KEY || this.llmApiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '512x512', // Reduced from 1024x1024 for cost savings (mobile display)
        quality: 'standard',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DALL-E 3 error: ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    return data.data[0].url;
  }

  /**
   * Get placeholder image URL as fallback
   */
  private getPlaceholderImage(user: User): string {
    const gender = user.gender === 'male' ? 'male' : 'female';
    const genre = user.genre_preference || 'modern';
    return `https://placehold.co/600x800/1a1a2e/eeaeee?text=${encodeURIComponent(`Daily+Story+${gender}+${genre}`)}`;
  }

  /*
  // Future: If user photo is available, we could use image-to-image generation
  // This would require a different API or service that supports img2img
  if (userPhotoUrl) {
    console.log(`💡 User photo provided, but DALL-E doesn't support image-to-image yet`);
    console.log(`💡 In the future, we could use a service like Stability AI for this`);
    // For now, we'll still generate a new image with DALL-E
  }
  */

  /**
   * Build image prompt from story text and user preferences
   */
  private buildImagePrompt(storyText: string, user: User): string {
    const gender = user.gender === 'male' ? 'handsome man' : 'beautiful woman';
    const genreKey = user.genre_preference || 'modern';

    const styleMap: Record<string, string> = {
      modern: 'modern professional',
      ancient: 'ancient chinese historical',
      fantasy: 'fantasy magical',
      urban: 'urban city',
      business: 'business executive'
    };

    const style = styleMap[genreKey] || 'modern professional';

    // Build a detailed prompt emphasizing exact facial features and identity
    return `A ${style} portrait of a ${gender}, same person, identical face, exact facial features, in a success moment, cinematic lighting, high quality, detailed, 8k resolution, professional photography, vibrant colors`;
  }
}

export const contentGenerator = new ContentGenerator();
