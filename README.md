# Daily Protagonist (每日主角)

一个个性化每日故事应用，为用户生成独特的每日故事，配以用户为主角的定制图片。

## 目录
- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [系统架构](#系统架构)
- [内容生成流程](#内容生成流程)
- [技术栈](#技术栈)
- [数据库设计](#数据库设计)
- [API接口](#api接口)
- [开发指南](#开发指南)
- [部署说明](#部署说明)

---

## 项目概述

**Daily Protagonist** 是一款移动应用，每天为用户生成个性化故事内容。用户每天会收到一篇400-600字的定制故事，配有一张将用户作为主角的真实感图片。应用利用先进的人工智能技术，根据用户的偏好设置和反馈数据来创建内容。

### 应用特点
- **个性化故事**: 根据用户性别、类型偏好、情绪偏好定制内容
- **定制图片**: 使用用户照片生成保持身份特征的图片
- **反馈系统**: 用户可以对内容进行评价，系统会根据反馈优化后续内容
- **爽文主题**: 包含打脸、逆袭、霸道总裁、商战等热门爽文元素
- **每日推送**: 每天早上8点准时推送新内容
- **历史记录**: 可查看最近7天的内容

---

## 核心功能

### 1. 用户管理
- **匿名注册**: 无需邮箱即可开始使用
- **邮箱登录**: 支持邮箱注册和登录
- **偏好设置**:
  - 性别选择 (男/女)
  - 故事类型 (现代都市、古代言情、奇幻玄幻、都市逆袭、商战职场)
  - 情绪主题 (霸道宠溺、打脸复仇、逆袭爽感、成长升级)
- **照片上传**: 用户可上传照片用于生成更真实的图片

### 2. 内容生成
- **故事创作**: 使用GPT-4o-mini生成400-600字的精致故事
- **图片生成**: 使用OpenAI gpt-image-1生成真实感图片
- **身份锁定**: 保持用户面部特征的identity lock技术
- **安全检测**: 自动检测和过滤不当内容

### 3. 推送系统
- **定时推送**: 每天早上8点自动推送
- **个性化时机**: 根据用户时区调整推送时间
- **重新生成**: 支持手动刷新获取新内容

### 4. 反馈系统
- **三档评价**: 喜欢/一般/不喜欢
- **智能分析**: 根据反馈数据优化内容推荐
- **偏好建议**: 系统会建议更合适的类型和情绪组合

### 5. 订阅系统
- **免费版**: 每日基础内容
- **高级版**: 更多内容、更高质量图片、无广告

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
├─────────────────────────────────────────────────────────────┤
│  iOS App (Swift/SwiftUI)    │    Web App (React - 计划中)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关层                              │
├─────────────────────────────────────────────────────────────┤
│         Express.js REST API (Node.js/TypeScript)            │
│  - 认证中间件  - 速率限制  - CORS配置  - 错误处理          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ 内容生成器  │  │ 场景生成器   │  │ 反馈分析器     │    │
│  │ ContentGen  │  │ SceneGen     │  │ FeedbackAnalyzer│   │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ 图片编辑服务│  │ 存储服务     │  │ 订阅服务       │    │
│  │ OpenAI Edit │  │ Cloudinary   │  │ Subscription   │    │
│  └─────────────┘  └──────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
├─────────────────────────────────────────────────────────────┤
│    SQLite 数据库    │    Cloudinary CDN    │   文件存储    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部服务集成                              │
├─────────────────────────────────────────────────────────────┤
│  OpenAI API (GPT-4o-mini, gpt-image-1, DALL-E 3)           │
│  Apple Push Notification Service (APNS)                     │
│  Firebase Cloud Messaging (FCM)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 内容生成流程

### 整体流程图

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────┐
│ 定时任务 │ -> │ 获取用户 │ -> │ 生成故事 │ -> │ 场景转换    │
│ Cron    │    │ Workers  │    │ LLM API  │    │ Scene Gen   │
└─────────┘    └──────────┘    └──────────┘    └─────────────┘
                                                     │
                                                     ▼
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────┐
│ 推送通知 │ <- │ 存储内容 │ <- │ 生成图片 │ <- │ 安全检测    │
│ Push    │    │ Database │    │ Image API│    │ Safety Check│
└─────────┘    └──────────┘    └──────────┘    └─────────────┘
```

### 1. 故事生成过程

```typescript
// 核心逻辑
async generateStory(user: User): Promise<string> {
  // 1. 获取用户偏好
  const { gender, genre, emotion } = user;

  // 2. 分析历史反馈，获取个性化建议
  const feedbackInsights = await analyzeUserFeedback(user.id);

  // 3. 构建提示词
  const prompt = buildStoryPrompt({
    gender,
    genre,
    emotion,
    personalization: feedbackInsights
  });

  // 4. 调用LLM API (GPT-4o-mini)
  const story = await callLLMAPI({
    model: 'gpt-4o-mini',
    maxTokens: 800,
    temperature: 0.85,
    prompt
  });

  // 5. 备用系统 (如果主模型失败)
  if (!story) {
    return generateFallbackStory(user);
  }

  return story;
}
```

**故事特点**:
- 长度: 400-600字 (原来是80-150字)
- 文风: 成熟细腻，有深度，不幼稚
- 代词: 第二人称"你"，增强代入感
- 情节: 完整的故事弧光，有起承转合

### 2. 场景转换过程

```typescript
// 故事 -> 场景的结构化转换
interface Scene {
  description: string;      // 场景描述
  camera: {
    shot: string;          // 景别 (全景/中景/特写)
    angle: string;         // 角度 (平视/仰视/俯视)
    distance: string;      // 距离描述
    action?: string;       // 人物动作
  };
  lighting: {
    type: string;          // 光线类型 (黄金时刻/蓝调时刻/戏剧侧光)
    quality: string;       // 光线质量描述
  };
  emotion: string;         // 情绪基调
  environment: string;     // 环境描述
  atmosphere: string;      // 氛围描述
  isSafe: boolean;         // 是否安全可渲染
  unsafeReason?: string;   // 不安全原因
}
```

**创意场景模板** (5种类型 × 4种情绪 = 20+模板):

| 类型 × 情绪 | 复仇 (Revenge) | 宠溺 (Favored) | 满足 (Satisfaction) | 成长 (Growth) |
|-------------|----------------|----------------|---------------------|---------------|
| **商战** | 玻璃幕墙办公室，俯瞰城市 | 豪华办公室，温暖灯光 | 庆祝时刻，香槟塔 | 签署重要合同 |
| **现代** | 高端会议室，犀利对视 | 咖啡馆约会场景 | 领奖台上，聚光灯 | 职场晋升时刻 |
| **都市** | 夜晚城市，霓虹灯光 | 高空餐厅夜景 | 成功派对，人群簇拥 | 创业成功，剪彩 |
| **奇幻** | 法师塔，掌控元素 | 魔法森林，精灵陪伴 | 龙背飞行，壮丽景色 | 突破境界，能量环绕 |
| **古代** | 皇宫大殿，君临天下 | 御花园，温柔相伴 | 凯旋归来，万民敬仰 | 修炼突破，天降异象 |

### 3. 图片生成过程

#### 两步法生成

**Step 1: 场景分析与安全检测**
```typescript
// 检测不当内容
const safetyCheck = analyzeSceneSafety(story);
if (!safetyCheck.isSafe) {
  // 重写为安全场景
  scene = generateSafeAlternative(user.preferences);
}
```

**Step 2: 图片生成 (两种模式)**

**模式A: 用户照片 + Identity Lock** (推荐)
```typescript
// 1. 下载用户照片并转换为RGBA格式
const { image, mask } = await downloadImageAsFile(userPhotoUrl);

// 2. 生成白色蒙版 (允许在所有区域编辑)
const whiteMask = generateWhiteMask(image.dimensions);

// 3. 调用 OpenAI Image Edit API
const result = await openai.images.edit({
  model: 'gpt-image-1',
  image: image,
  mask: whiteMask,
  prompt: buildImagePromptWithIdentityLock(scene, userGender),
  size: '512x512'  // 成本优化 (原1024x1024)
});

// 4. 处理返回的base64图片
if (result.b64_json) {
  const buffer = Buffer.from(result.b64_json, 'base64');
  imageUrl = await uploadToCloudinary(buffer);
}
```

**Identity Lock 提示词结构**:
```
CRITICAL IDENTITY REQUIREMENTS:
1. EXACT SAME FACE as the reference photo
2. SAME eye shape, eye color, eyebrows, nose, lips, face shape
3. SAME hairstyle and hair color as reference
4. SAME skin tone and complexion
5. Preserve any distinctive features: glasses, freckles, beauty marks
6. The face must be RECOGNIZABLE as the SAME PERSON
7. DO NOT change any facial characteristics
8. Match the exact age and appearance from reference photo

SCENE DETAILS:
[场景描述]
- Environment: [环境]
- Lighting: [光线]
- Camera: [机位]
- Action: [动作]
- Mood: [情绪]
```

**模式B: 纯文字生成** (备用)
```typescript
// DALL-E 3 直接生成
const result = await openai.images.generate({
  model: 'dall-e-3',
  prompt: sceneDescription,
  size: '512x512'
});
```

### 4. 成本优化

| 项目 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| 图片尺寸 | 1024x1024 | 512x512 | 70% |
| 单次图片成本 | $0.08-0.12 | $0.02-0.04 | 70% |
| 故事模型 | gpt-3.5-turbo | gpt-4o-mini | 质量提升 |
| 故事长度 | 80-150字 | 400-600字 | 4倍 |

---

## 技术栈

### 后端

| 技术/框架 | 用途 |
|----------|------|
| **Node.js 18+** | 运行环境 |
| **Express.js** | Web框架 |
| **TypeScript** | 类型安全 |
| **SQLite** | 数据库 |
| **better-sqlite3** | SQLite驱动 |
| **JWT** | 身份认证 |
| **form-data** | 文件上传 |
| **sharp** | 图片处理 |
| **node-cron** | 定时任务 |

### 外部服务

| 服务 | 用途 |
|------|------|
| **OpenAI API** | GPT-4o-mini (故事), gpt-image-1 (图片), DALL-E 3 (备用) |
| **Cloudinary** | 图片存储和CDN |
| **APNS** | iOS推送通知 |
| **FCM** | Android推送通知 (计划中) |

### iOS应用

| 技术/框架 | 用途 |
|----------|------|
| **Swift 5.9+** | 编程语言 |
| **SwiftUI** | UI框架 |
| **MVVM** | 架构模式 |
| **Combine** | 响应式编程 |
| **URLSession** | 网络请求 |

---

## 数据库设计

### 表结构

#### users (用户表)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  anonymous_id TEXT UNIQUE,
  gender TEXT CHECK(gender IN ('male', 'female')),
  genre_preference TEXT CHECK(genre_preference IN ('modern', 'ancient', 'fantasy', 'urban', 'business')),
  emotion_preference TEXT CHECK(emotion_preference IN ('favored', 'revenge', 'satisfaction', 'growth')),
  push_token_ios TEXT,
  push_token_android TEXT,
  is_onboarded INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### daily_contents (每日内容表)
```sql
CREATE TABLE daily_contents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD格式
  text TEXT NOT NULL,  -- 故事内容 (400-600字)
  image_url TEXT NOT NULL,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);
```

#### feedback (反馈表)
```sql
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  rating TEXT CHECK(rating IN ('like', 'neutral', 'dislike')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES daily_contents(id),
  UNIQUE(content_id)
);
```

#### user_photos (用户照片表)
```sql
CREATE TABLE user_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### content_generations (生成记录表)
```sql
CREATE TABLE content_generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  story_prompt TEXT,
  scene_prompt TEXT,
  image_prompt TEXT,
  llm_model TEXT,
  image_model TEXT,
  generation_time_ms INTEGER,
  status TEXT CHECK(status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);
```

---

## API接口

### 基础URL
- 开发环境: `http://localhost:3000/api`
- 生产环境: `https://backend-production-61f4.up.railway.app/api`

### 认证

使用JWT Bearer Token认证:
```
Authorization: Bearer <token>
```

### 端点列表

#### 认证相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 注册/登录 | 否 |
| POST | `/auth/login` | 邮箱登录 | 否 |

**注册响应示例**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": null,
    "isOnboarded": false
  }
}
```

#### 用户管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/user/onboarding` | 完成新手引导 | 是 |
| GET | `/user/preferences` | 获取用户偏好 | 是 |
| PUT | `/user/preferences` | 更新用户偏好 | 是 |
| POST | `/user/push-token` | 注册推送Token | 是 |

**偏好设置请求**:
```json
{
  "gender": "male",
  "genre_preference": "business",
  "emotion_preference": "revenge"
}
```

#### 内容相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/content/today` | 获取今日内容 | 是 |
| GET | `/content/history` | 获取历史记录 | 是 |
| GET | `/content/:id` | 获取指定内容 | 是 |
| POST | `/content/generate` | 手动生成内容 | 是 |

**今日内容响应**:
```json
{
  "success": true,
  "content": {
    "id": "content-uuid",
    "text": "今天是你担任CEO的第一天...",
    "imageUrl": "https://res.cloudinary.com/...",
    "date": "2026-01-23",
    "feedback": null
  }
}
```

#### 照片管理

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/photos/upload` | 上传照片 | 是 |
| GET | `/photos` | 获取照片列表 | 是 |
| DELETE | `/photos/:id` | 删除照片 | 是 |

**上传照片**:
```
Content-Type: multipart/form-data

photo: <file>
```

#### 反馈相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/feedback` | 提交反馈 | 是 |
| GET | `/feedback/insights/user` | 获取反馈洞察 | 是 |
| GET | `/feedback/suggestions/user` | 获取个性化建议 | 是 |

**反馈请求**:
```json
{
  "contentId": "content-uuid",
  "rating": "like"
}
```

**反馈洞察响应**:
```json
{
  "totalFeedbacks": 45,
  "likePercentage": 73,
  "neutralPercentage": 18,
  "dislikePercentage": 9,
  "combinations": [
    {
      "genre": "business",
      "emotion": "revenge",
      "likeCount": 15,
      "totalCount": 18,
      "likePercentage": 83
    }
  ],
  "trend": "improving",
  "suggestion": {
    "shouldChange": false,
    "recommendedGenre": "business",
    "recommendedEmotion": "revenge",
    "reason": "当前组合表现良好，83%的满意度"
  }
}
```

#### 订阅相关

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/subscription/status` | 获取订阅状态 | 是 |
| POST | `/subscription/status` | 更新订阅状态 | 是 (管理员) |

---

## 开发指南

### 后端开发

#### 环境变量配置
```bash
# .env
NODE_ENV=development
PORT=3000

# 数据库
DATABASE_PATH=./data/database.db

# JWT密钥
JWT_SECRET=your-secret-key

# OpenAI API
LLM_API_KEY=sk-...
IMAGE_API_KEY=sk-...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

#### 安装依赖
```bash
cd backend
npm install
```

#### 数据库初始化
```bash
npm run db:init
```

#### 开发模式
```bash
npm run dev
```

#### 构建生产版本
```bash
npm run build
npm start
```

#### 手动生成内容
```bash
# 为所有用户生成今日内容
npm run worker generate-all

# 为特定用户生成
npm run worker generate-user <user-id>
```

### iOS开发

#### 项目结构
```
DailyProtagonist/
├── Models/           # 数据模型
│   └── User.swift
├── ViewModels/       # 视图模型
│   ├── TodayViewModel.swift
│   ├── DailyImageViewModel.swift
│   └── ProfileViewModel.swift
├── Views/            # 视图
│   ├── OnboardingView.swift
│   ├── TodayView.swift
│   ├── HistoryView.swift
│   └── ProfileView.swift
├── Services/         # 服务层
│   ├── APIService.swift
│   ├── DailyImageCache.swift
│   └── PushNotificationManager.swift
└── DailyProtagonistApp.swift
```

#### 配置API地址
编辑 `Services/APIService.swift`:
```swift
private let baseURL = "http://localhost:3000/api"  // 开发环境
// private let baseURL = "https://backend-production-xxx.up.railway.app/api"  // 生产环境
``#### 配置推送通知
1. 在Xcode中启用Push Notifications capability
2. 配置APNS证书
3. 处理推送token注册

---

## 部署说明

### 后端部署 (Railway)

1. 连接GitHub仓库
2. 配置环境变量
3. 自动部署

### 推送通知配置

#### iOS (APNS)
1. 创建Apple Developer账号
2.配置Push Notifications capability
3. 上传APNS密钥到服务器

#### Android (FCM) - 计划中
1. 创建Firebase项目
2. 添加FCM服务器密钥
3. 集成FCM SDK

### 监控和日志

- 使用应用日志监控系统状态
- Cloudinary仪表板监控图片使用
- OpenAI仪表板监控API使用和成本

---

## 爽文类型说明

### 类型 (Genre)

| 中文 | 英文 | 描述 |
|------|------|------|
| 职场逆袭 | modern | 现代职场打脸、逆袭故事 |
| 现代都市 | urban | 都市生活、成功奋斗 |
| 古代言情 | ancient | 古代言情、宫廷权谋 |
| 奇幻玄幻 | fantasy | 奇幻魔法、修仙玄幻 |
| 商战职场 | business | 商业战争、职场博弈 |

### 情绪 (Emotion)

| 中文 | 英文 | 描述 |
|------|------|------|
| 霸道宠溺 | favored | 霸道总裁、无限宠溺 |
| 打脸复仇 | revenge | 复仇打脸、痛快淋漓 |
| 逆袭爽感 | satisfaction | 逆袭成功、扬眉吐气 |
| 成长升级 | growth | 实力提升、地位上升 |

---

## 未来计划

### 功能规划
- [ ] Widget小组件支持
- [ ] 自定义头像系统
- [ ] 音频故事 (TTS)
- [ ] 社交分享功能
- [ ] 多语言支持
- [ ] 深色模式
- [ ] 用户社区

### 技术优化
- [ ] 更精准的身份保持算法
- [ ] 多参考照片支持
- [ ] 离线数据库 (Core Data)
- [ ] 图片缓存优化
- [ ] 性能监控和分析

---

## License

ISC License

---

*Daily Protagonist - 每天让你成为自己故事的主角*
