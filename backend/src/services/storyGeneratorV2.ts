/**
 * Story Generator V2 - Multi-Provider Story Generation Service
 *
 * Strategy: Claude Sonnet 4 (primary) → OpenAI GPT-4o-mini (fallback)
 * Claude provides better creative writing and 爽文 elements
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// Type Definitions
// ============================================

export interface StoryGenerationParams {
  gender: 'male' | 'female';
  genre: 'modern' | 'ancient' | 'fantasy' | 'urban' | 'business';
  emotion: 'favored' | 'revenge' | 'satisfaction' | 'growth';
  feedbackInsights?: FeedbackInsights;
}

export interface FeedbackInsights {
  likePercentage: number;
  preferredElements: string[];
  avoidElements: string[];
}

export interface StoryGenerationResult {
  story: string;
  sceneDescription: string;
  provider: 'claude' | 'openai';
  generationTimeMs: number;
}

interface StoryTemplate {
  genre: string;
  emotion: string;
  hooks: string[];      // 开场钩子
  plotBeats: string[];  // 情节节奏点
  climaxes: string[];   // 高潮时刻
}

// ============================================
// 爽文 Story Templates - 核心爽点要素
// ============================================

const STORY_TEMPLATES: Record<string, StoryTemplate> = {
  // 商战 + 复仇
  business_revenge: {
    genre: '商战',
    emotion: '复仇',
    hooks: [
      '曾经被扫地出门，今天让他们跪着求你回来',
      '当年看不起你的人，现在要叫你一声"老板"',
      '他们以为你完了，殊不知这才是你的开始',
      '那个签下你的公司破产协议的人，今天求你收购'
    ],
    plotBeats: [
      '被轻视/羞辱的开场 - 会议室里冷嘲热讽',
      '隐藏实力的暗示 - 你淡定地展示关键证据',
      '关键时刻的反转 - 真相大白，对方震惊',
      '对手的反应 - 惊恐、后悔、求饶',
      '主角淡定的收场 - 轻描淡写地接受胜利'
    ],
    climaxes: [
      '签下收购协议的那一刻，全场死寂',
      '你站起来，那个曾羞辱你的人现在不敢抬头',
      '掌声响起，你只是微微颔首，深藏功与名'
    ]
  },

  // 商战 + 宠溺
  business_favored: {
    genre: '商战',
    emotion: '宠溺',
    hooks: [
      '霸道总裁亲自为你挡酒："她的酒，我来喝"',
      '全公司都知道，总裁的禁区只有你能进',
      '他冷漠待人，却只对你温柔到骨子里',
      '为了你，他买下了整家公司'
    ],
    plotBeats: [
      '看似普通的相遇 - 电梯、茶水间、走廊偶遇',
      '他对你格外不同 - 别人怕他，你却可以随意',
      '旁人的震惊 - "她居然敢拍总裁的肩膀！"',
      '他霸道护短的瞬间 - "谁敢动她？"',
      '甜蜜的独处时刻 - 只有两人的办公室'
    ],
    climaxes: [
      '他在所有人面前单膝跪地求婚',
      '为你包下整个城市的烟花秀',
      '"我的帝国，分你一半"'
    ]
  },

  // 商战 + 满足
  business_satisfaction: {
    genre: '商战',
    emotion: '逆袭爽感',
    hooks: [
      '从被看不起的实习生到集团总裁',
      '你用三年时间，证明所有人错了',
      '上市钟声响起，你想起这三年来的每个深夜',
      '曾经质疑你的人，现在排队来求你投资'
    ],
    plotBeats: [
      '谷底时刻 - 被质疑、被否定、甚至被开除',
      '默默努力 - 深夜加班、自学、寻找机会',
      '抓住机遇 - 一个项目让你证明自己',
      '一鸣惊人 - 你的方案让所有人刮目相看',
      '登上巅峰 - 成为行业领袖'
    ],
    climaxes: [
      '站在纳斯达克的敲钟台上',
      '财经杂志封面上的人物专访',
      '曾经否定你的人，现在争相和你合影'
    ]
  },

  // 现代 + 复仇
  modern_revenge: {
    genre: '现代职场',
    emotion: '复仇',
    hooks: [
      '电梯门打开的那一刻，整个办公室安静了',
      '那个陷害你的人，现在看到你如见鬼神',
      '你穿着定制西装，从容地走进曾经的办公室',
      '他们以为是来面试，没想到你是新老板'
    ],
    plotBeats: [
      '被陷害/背叛 - 背黑锅被开除',
      '三年沉淀 - 你去更好的平台，成为行业专家',
      '强势回归 - 以收购方代表身份出现',
      '打脸时刻 - 揭露当年真相',
      '正义得伸 - 害人得到应有惩罚'
    ],
    climaxes: [
      '你坐在主位上，曾经的上司站在对面',
      '"现在，谁来给我汇报工作？"',
      '全场震惊，你只是淡淡一笑'
    ]
  },

  // 现代 + 宠溺
  modern_favored: {
    genre: '现代职场',
    emotion: '宠溺',
    hooks: [
      '公司传说的高冷男神，居然每天给你带早餐',
      '他从不加班，但会等你一起下班',
      '你在会议室被刁难，他突然推门进来',
      '全公司都知道：她在他在，天都在'
    ],
    plotBeats: [
      '新来的实习生，有点怕他',
      '他意外地对你温柔 - 帮你解围',
      '慢慢发现，他的冷漠只对别人',
      '公开关系 - 全司震惊',
      '甜蜜日常 - 他的温柔只属于你'
    ],
    climaxes: [
      '他在全公司面前宣布："她是我的人"',
      '为你放弃千万合约，"你比工作重要"'
    ]
  },

  // 都市 + 复仇
  urban_revenge: {
    genre: '都市',
    emotion: '复仇',
    hooks: [
      '曾经住地下室的你，现在住进了顶层公寓',
      '那些看不起你的邻居，现在在业主群里巴结你',
      '开着豪车回老街区，那些人脸上的表情',
      '前女友看到现在的你，后悔的眼神藏不住'
    ],
    plotBeats: [
      '底层生活 - 被歧视、被看不起',
      '奋斗历程 - 打工、创业、抓住机会',
      '一举翻身 - 成功后回到熟悉的地方',
      '打脸时刻 - 曾经看不起你的人改变态度',
      '潇洒离开 - 不再在意他们的看法'
    ],
    climaxes: [
      '在高级餐厅偶遇前女友，她不敢相认',
      '随手买单，"这顿我请"'
    ]
  },

  // 都市 + 宠溺
  urban_favored: {
    genre: '都市',
    emotion: '宠溺',
    hooks: [
      '他拥有整个城市，却只为你一个人做饭',
      '你是全城唯一敢拒绝他的人',
      '他追踪你的行程，只为偶遇',
      '你是他的软肋，也是他的铠甲'
    ],
    plotBeats: [
      '意外的相遇 - 高不可攀的他竟然对你特别',
      '笨拙的追妻 - 帝尔伐木功出洋相',
      '你慢慢接受 - 发现他的真心',
      '公开关系 - 他向全世界宣布你是他的',
      '甜蜜日常 - 宠溺到极致'
    ],
    climaxes: [
      '为你包下整个城市的烟火',
      '"只要你开心，整个城市都是你的"'
    ]
  },

  // 奇幻 + 复仇
  fantasy_revenge: {
    genre: '奇幻',
    emotion: '复仇',
    hooks: [
      '被宗门除名的废物，原来是绝世天才',
      '三年之约，今天你归来打脸所有人',
      '他们以为你是废柴，没想到你是神',
      '曾经欺辱你的宗门，现在跪求你原谅'
    ],
    plotBeats: [
      '被陷害/被逐出师门',
      '隐姓埋名修炼',
      '实力突破 - 达到无人能及的境界',
      '强势归来 - 宗门大比一鸣惊人',
      '真相大白 - 当年的阴谋被揭露'
    ],
    climaxes: [
      '一招击败宗主',
      '"当年，你们说我废；今天，我让你们知道什么是真正的废"'
    ]
  },

  // 奇幻 + 宠溺
  fantasy_favored: {
    genre: '奇幻',
    emotion: '宠溺',
    hooks: [
      '魔尊大人竟然为了一个凡人，逆天改命',
      '全修真界都知道：她是他的逆鳞',
      '你受伤了，他血洗了整个宗门',
      '"哪怕举世皆敌，我也护你周全"'
    ],
    plotBeats: [
      '平凡凡人遇到修真大佬',
      '他意外地对你温柔',
      '修真界震惊 - 魔尊居然有软肋',
      '有人欺负你 - 他震怒',
      '生死与共 - 你出事他什么都敢做'
    ],
    climaxes: [
      '为你屠尽天下',
      '"你若不在，我要这修真界何用？"'
    ]
  },

  // 古代 + 复仇
  ancient_revenge: {
    genre: '古代',
    emotion: '复仇',
    hooks: [
      '被流放废太子，如今率军回朝',
      '当年陷害你的人，现在在大殿上瑟瑟发抖',
      '你骑着战马回到京城，万民夹道欢迎',
      '那个篡位的皇帝，现在跪在你面前'
    ],
    plotBeats: [
      '被陷害/流放',
      '积蓄力量 - 招兵买马、联络旧部',
      '举兵回朝',
      '攻入皇宫，揭露真相',
      '夺回皇位，惩治奸佞'
    ],
    climaxes: [
      '坐在龙椅上，俯视跪在地上的奸臣',
      '"当年，你说我配不上这个位置"'
    ]
  },

  // 古代 + 宠溺
  ancient_favored: {
    genre: '古代',
    emotion: '宠溺',
    hooks: [
      '皇帝批阅奏折到深夜，你一进去他立刻放下',
      '全后宫都知道：宠冠六宫',
      '你生病了，他亲自尝药，甚至不上朝',
      '"朕富有天下，但不如你一笑"'
    ],
    plotBeats: [
      '选秀入宫',
      '他对你的特别',
      '其他嫔妃的嫉妒',
      '他为你破例',
      '专宠六宫'
    ],
    climaxes: [
      '立你为后',
      '"从今往后，这后宫只许你一人"'
    ]
  },

  // 通用成长
  growth: {
    genre: '通用',
    emotion: '成长',
    hooks: [
      '每一次跌倒，都是为了爬得更高',
      '别人还在犹豫，你已经完成了第一次迭代',
      '那些嘲笑你努力的人，现在只能仰望你',
      '你证明了：只要坚持，没有什么不可能'
    ],
    plotBeats: [
      '遇到困难',
      '坚持不懈',
      '突破瓶颈',
      '获得成长',
      '实现目标'
    ],
    climaxes: [
      '站在新的高度，回望来路',
      '"所有的努力，都值得了"'
    ]
  }
};

// ============================================
// Configuration
// ============================================

const CONFIG = {
  claude: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1500,
    temperature: 0.85,
  },
  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 1000,
    temperature: 0.85,
  }
};

// ============================================
// Main Entry Point
// ============================================

/**
 * Generate story with Claude (primary) or OpenAI (fallback)
 */
export async function generateStory(
  params: StoryGenerationParams
): Promise<StoryGenerationResult> {
  const startTime = Date.now();

  console.log('📝 Starting story generation V2...');
  console.log(`👤 Gender: ${params.gender}, Genre: ${params.genre}, Emotion: ${params.emotion}`);

  // Try Claude first
  try {
    console.log('🤖 Using Claude Sonnet 4 (best creative writing)...');
    const result = await generateWithClaude(params);
    const duration = Date.now() - startTime;

    return {
      story: result.story,
      sceneDescription: result.sceneDescription,
      provider: 'claude',
      generationTimeMs: duration,
    };
  } catch (error) {
    console.warn('⚠️  Claude failed, falling back to OpenAI:', error instanceof Error ? error.message : error);

    // Direct fallback to OpenAI to avoid circular dependency
    const story = await generateWithOpenAI(params);
    const duration = Date.now() - startTime;
    return {
      story,
      sceneDescription: extractSceneFromStory(story),
      provider: 'openai',
      generationTimeMs: duration,
    };
  }
}

// ============================================
// Claude Implementation
// ============================================

async function generateWithClaude(
  params: StoryGenerationParams
): Promise<{ story: string; sceneDescription: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = buildSystemPrompt(params.gender, params.genre, params.emotion);
  const userPrompt = buildUserPrompt(params, getTemplate(params.genre, params.emotion));

  console.log(`📝 System prompt length: ${systemPrompt.length} chars`);
  console.log(`📝 User prompt length: ${userPrompt.length} chars`);

  const response = await anthropic.messages.create({
    model: CONFIG.claude.model,
    max_tokens: CONFIG.claude.maxTokens,
    temperature: CONFIG.claude.temperature,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  });

  const fullText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse story and scene description
  const { story, sceneDescription } = parseStoryOutput(fullText);

  console.log(`✅ Claude story generated: ${story.substring(0, 50)}...`);
  console.log(`🎭 Scene: ${sceneDescription}`);

  return { story, sceneDescription };
}

// ============================================
// OpenAI Fallback Implementation
// ============================================

async function generateWithOpenAI(
  params: StoryGenerationParams
): Promise<string> {
  const apiKey = process.env.LLM_API_KEY || '';
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }

  console.log('🤖 Using OpenAI GPT-4o-mini fallback...');

  const genreMap: Record<string, string> = {
    modern: '现代职场',
    ancient: '古代宫廷/江湖',
    fantasy: '奇幻修仙',
    urban: '都市生活',
    business: '商战风云'
  };

  const emotionMap: Record<string, string> = {
    favored: '霸道宠溺 - 被强大的人独宠，甜到心里',
    revenge: '打脸复仇 - 曾经看不起我的人，现在后悔了吧',
    satisfaction: '逆袭成功 - 从谷底到巅峰的快感',
    growth: '成长升级 - 变强的感觉太爽了'
  };

  const prompt = `请创作一篇400-600字的都市爽文片段，具体要求：

【基础设定】
- 主角性别：${params.gender === 'male' ? '男性' : '女性'}
- 题材类型：${genreMap[params.genre]}
- 情感基调：${emotionMap[params.emotion]}

【写作要求】
1. 第二人称"你"叙述，让读者完全沉浸其中
2. 文笔成熟细腻，避免简单直白的表述
3. 有完整的情节发展：开场铺垫 → 冲突/转折 → 高潮 → 余韵
4. 注重细节描写：神态、动作、环境、心理都要有层次感
5. 对话要符合情境和人物身份，推动情节发展
6. 营造强烈的画面感和代入感

请直接输出故事内容，不要标题，不要前言。`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一位成熟的都市小说作家，擅长创作细腻、有深度、引人入胜的都市爽文。'
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
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json() as any;
  const text = data.choices[0].message.content.trim();

  console.log(`✅ OpenAI story generated: ${text.substring(0, 50)}...`);
  return text;
}

// ============================================
// Prompt Builders
// ============================================

function buildSystemPrompt(
  gender: string,
  genre: string,
  emotion: string
): string {
  const genderTerm = gender === 'male' ? '男主' : '女主';
  const pronouns = { subject: '你', object: '你' };

  return `你是一位顶级的都市爽文作家，擅长创作让人欲罢不能、代入感极强的短篇故事。

## 写作风格
1. **开篇即高能** - 3秒内抓住读者，不要冗长的铺陈
2. **情绪张力拉满** - 让读者完全沉浸在"爽"的感觉中
3. **节奏紧凑** - 绝不拖泥带水，每个字都有价值
4. **结尾留钩子** - 让读者意犹未尽，期待下一篇

## 核心原则
1. 使用第二人称"你"，让读者成为${genderTerm}
2. 故事长度：400-600字，不多不少
3. 必须有"爽点" - 那个让读者心跳加速、暗爽的瞬间
4. 配角的反应很重要 - 用他们的震惊/嫉妒/后悔来衬托你的强大
5. 细节描写 - 神态、动作、环境、心理都要有层次感

## 爽文要素
- **打脸** - 曾经看不起你的人，现在后悔莫及
- **逆袭** - 从谷底到巅峰的快意
- **宠溺** - 被强大的人独宠的感觉
- **复仇** - 正义得到伸张的爽快
- **成长** - 实力提升的成就感

## 输出格式
请严格按以下格式输出：

【故事】
(这里写400-600字的故事正文)

【场景】
(这里用一句话描述最适合配图的关键场景，包含：地点、光线、人物表情/动作)
`;
}

function buildUserPrompt(
  params: StoryGenerationParams,
  template?: StoryTemplate
): string {
  const genreMap: Record<string, string> = {
    modern: '现代职场',
    ancient: '古代宫廷/江湖',
    fantasy: '奇幻修仙',
    urban: '都市生活',
    business: '商战风云'
  };

  const emotionMap: Record<string, string> = {
    favored: '霸道宠溺 - 被强大的人独宠，甜到心里',
    revenge: '打脸复仇 - 曾经看不起我的人，现在后悔了吧',
    satisfaction: '逆袭成功 - 从谷底到巅峰的快感',
    growth: '成长升级 - 变强的感觉太爽了'
  };

  let prompt = `## 任务
写一篇【${genreMap[params.genre]}】题材，【${emotionMap[params.emotion]}】情绪的爽文。

## 基础设定
- 主角性别：${params.gender === 'male' ? '男性' : '女性'}
- 故事长度：400-600字`;

  // Add template hooks if available
  if (template) {
    prompt += `

## 故事灵感
- 开场钩子（选一个）：
  • ${template.hooks[0]}
  • ${template.hooks[1]}
  • ${template.hooks[2]}

- 情节节奏：
${template.plotBeats.map((beat, i) => `  ${i + 1}. ${beat}`).join('\n')}

- 高潮时刻：
${template.climaxes.map((climax, i) => `  • ${climax}`).join('\n')}
`;
  }

  // Add feedback-based personalization
  if (params.feedbackInsights) {
    const insights = params.feedbackInsights;
    if (insights.preferredElements && insights.preferredElements.length > 0) {
      prompt += `\n\n## 用户偏好\n用户喜欢的元素：${insights.preferredElements.join('、')}，请多加入这些。`;
    }
    if (insights.avoidElements && insights.avoidElements.length > 0) {
      prompt += `\n避免的元素：${insights.avoidElements.join('、')}`;
    }
  }

  prompt += `\n\n现在，给我一个让人直呼过瘾的故事！要爽！要够爽！`;

  return prompt;
}

function getTemplate(
  genre: string,
  emotion: string
): StoryTemplate | undefined {
  const key = `${genre}_${emotion}`;
  return STORY_TEMPLATES[key] || STORY_TEMPLATES.growth;
}

// ============================================
// Output Parser
// ============================================

function parseStoryOutput(text: string): {
  story: string;
  sceneDescription: string;
} {
  // Extract 【故事】 section
  const storyMatch = text.match(/【故事】\s*([\s\S]*?)(?=【场景】|$)/);
  const story = storyMatch ? storyMatch[1].trim() : text;

  // Extract 【场景】 section
  const sceneMatch = text.match(/【场景】\s*([\s\S]*?)$/);
  const sceneDescription = sceneMatch
    ? sceneMatch[1].trim()
    : extractSceneFromStory(story);

  return { story, sceneDescription };
}

function extractSceneFromStory(story: string): string {
  // Extract key scene from story if no explicit scene description
  // Look for action/environment descriptions
  const sentences = story.split('。');
  for (const sentence of sentences) {
    if (sentence.includes('会议室') || sentence.includes('办公室') ||
        sentence.includes('公司') || sentence.includes('写字楼')) {
      return sentence.trim() + '，职业场景';
    }
  }
  return '现代都市职业场景，自信姿态';
}

// ============================================
// Metrics and Analytics
// ============================================

interface ProviderMetrics {
  success: number;
  failure: number;
  totalTime: number;
}

const metricsStore = new Map<string, ProviderMetrics>();

function recordMetrics(
  provider: 'claude' | 'openai',
  success: boolean,
  duration: number
) {
  const metrics = metricsStore.get(provider) || { success: 0, failure: 0, totalTime: 0 };

  if (success) {
    metrics.success++;
    metrics.totalTime += duration;
  } else {
    metrics.failure++;
  }

  metricsStore.set(provider, metrics);
}

export function getStoryMetrics() {
  const result: Record<string, any> = {};

  for (const [provider, metrics] of metricsStore.entries()) {
    result[provider] = {
      ...metrics,
      avgTime: metrics.success > 0 ? metrics.totalTime / metrics.success : 0,
      successRate: metrics.success + metrics.failure > 0
        ? metrics.success / (metrics.success + metrics.failure)
        : 0
    };
  }

  return result;
}

// ============================================
// Export singleton
// ============================================

export const storyGeneratorV2 = {
  generateStory,
  getStoryMetrics,
};
