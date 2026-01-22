/**
 * Creative Scene Generator Service
 * Generates vivid, dreamlike, cinematic scenes while preserving user's identity
 */

export interface Scene {
  description: string;
  // Creative camera settings
  camera: {
    shot: 'full-body' | 'medium-shot' | 'wide-shot' | 'dynamic-angle' | 'close-up-detail';
    angle: 'eye-level' | 'low-angle' | 'high-angle' | 'dutch-angle' | 'over-shoulder' | 'slight high-angle' | 'dynamic-angle';
    distance: string;
    action?: string; // What the person is doing
  };
  // Dramatic lighting
  lighting: {
    type: 'golden-hour' | 'blue-hour' | 'dramatic-side' | 'backlit-silhouette' | 'soft-diffused' | 'neon-glow' | 'candlelight';
    quality: string; // Additional description
  };
  // Subject emotion and state
  emotion: 'confident' | 'triumphant' | 'mysterious' | 'dreamy' | 'powerful' | 'serene' | 'determined' | 'thoughtful';
  // Creative environment
  environment: string;
  // Atmosphere and mood
  atmosphere: string;
  // Is scene safe for photorealistic person rendering?
  isSafe: boolean;
  unsafeReason?: string;
}

export interface StoryAnalysis {
  hasFantasyElements: boolean;
  hasExtremeEmotions: boolean;
  hasLightingIssues: boolean;
  hasIdentityAlteration: boolean;
  suggestedScene: Scene;
}

// Creative scene templates based on genre and emotion
const CREATIVE_SCENES: Record<string, Record<string, Array<{
  description: string;
  camera: {
    shot: 'full-body' | 'medium-shot' | 'wide-shot' | 'dynamic-angle' | 'close-up-detail';
    angle: 'eye-level' | 'low-angle' | 'high-angle' | 'dutch-angle' | 'over-shoulder' | 'slight high-angle' | 'dynamic-angle';
    distance: string;
    action?: string;
  };
  lighting: {
    type: 'golden-hour' | 'blue-hour' | 'dramatic-side' | 'backlit-silhouette' | 'soft-diffused' | 'neon-glow' | 'candlelight';
    quality: string;
  };
  emotion: 'confident' | 'triumphant' | 'mysterious' | 'dreamy' | 'powerful' | 'serene' | 'determined' | 'thoughtful';
  environment: string;
  atmosphere: string;
}>>> = {
  // Business/Workplace scenes - dramatic and powerful
  business: {
    revenge: [
      {
        description: 'Power moment in a glass-walled skyscraper',
        camera: { shot: 'medium-shot', angle: 'low-angle', distance: 'standing confidently at floor-to-ceiling windows overlooking city skyline at sunset', action: 'gazing out at the empire you built' },
        lighting: { type: 'golden-hour', quality: 'warm golden light streaming through windows, creating dramatic rim light and long shadows' },
        emotion: 'triumphant',
        environment: 'luxury corner office with panoramic city view, marble floors, modern furniture, city skyline visible through glass walls',
        atmosphere: 'Powerful, victorious, commanding, the pinnacle of success'
      },
      {
        description: 'Dramatic boardroom showdown',
        camera: { shot: 'full-body', angle: 'eye-level', distance: 'standing at head of polished conference table, hands resting confidently on table', action: 'delivering the final word that silenced everyone' },
        lighting: { type: 'dramatic-side', quality: 'strong directional light from side windows creating dramatic chiaroscuro, emphasizing presence and authority' },
        emotion: 'powerful',
        environment: 'high-end boardroom with rich wood table, leather chairs, city backdrop through windows, documents scattered from your presentation',
        atmosphere: 'Intense, commanding, absolutely dominant, the room respects your authority'
      },
      {
        description: 'Rooftop triumph at dusk',
        camera: { shot: 'wide-shot', angle: 'low-angle', distance: 'full figure on rooftop terrace with city lights beginning to twinkle below', action: 'arms slightly raised, breathing in your victory' },
        lighting: { type: 'blue-hour', quality: 'magical twilight with city lights glowing, sky painted in purple and orange gradients' },
        emotion: 'triumphant',
        environment: 'rooftop terrace with glass railing, panoramic view of city skyline, first lights appearing in buildings, gentle breeze',
        atmosphere: 'Ethereal, victorious, at the top of the world, unlimited possibilities'
      },
      {
        description: 'Signing the deal of a lifetime',
        camera: { shot: 'medium-shot', angle: 'over-shoulder', distance: 'leaning forward to sign document on expensive desk', action: 'putting pen to paper on a contract worth millions' },
        lighting: { type: 'soft-diffused', quality: 'elegant indoor lighting with warm accents, highlighting the focused expression and steady hands' },
        emotion: 'determined',
        environment: 'premium office with mahogany desk, city view, legal documents, expensive pen, luxury furnishings',
        atmosphere: 'Focused, decisive, historic moment, the climax of negotiations'
      }
    ],
    favored: [
      {
        description: 'Being celebrated in a luxury venue',
        camera: { shot: 'full-body', angle: 'eye-level', distance: 'center of attention, people applauding in background', action: 'accepting accolades with genuine smile' },
        lighting: { type: 'golden-hour', quality: 'warm celebratory light, camera flashes, feeling like a star' },
        emotion: 'confident',
        environment: 'upscale venue with chandeliers, champagne flutes, well-dressed crowd, red carpet or VIP area, festive atmosphere',
        atmosphere: 'Celebrated, admired, cherished, the protagonist of this success story'
      },
      {
        description: 'Private moment of luxury and success',
        camera: { shot: 'medium-shot', angle: 'slight high-angle', distance: 'relaxed in elegant setting', action: 'enjoying the fruits of success' },
        lighting: { type: 'soft-diffused', quality: 'gentle flattering light, warm tones,营造舒适感' },
        emotion: 'serene',
        environment: 'luxury penthouse, spa, or high-end lounge with premium decor, city view, comfort and elegance',
        atmosphere: 'Pampered, luxurious, deeply satisfied, every wish fulfilled'
      }
    ],
    satisfaction: [
      {
        description: 'Standing at the peak of career achievement',
        camera: { shot: 'wide-shot', angle: 'low-angle', distance: 'full body in grand achievement space', action: 'taking in the magnitude of what you accomplished' },
        lighting: { type: 'backlit-silhouette', quality: 'dramatic backlighting creating a powerful silhouette against bright success' },
        emotion: 'triumphant',
        environment: 'grand hall, stage, or achievement space with banners, awards, crowd, sense of momentous occasion',
        atmosphere: 'Triumphant, legendary, the culmination of all efforts, absolute peak'
      }
    ],
    growth: [
      {
        description: 'Transformation moment in a modern space',
        camera: { shot: 'dynamic-angle', angle: 'dutch-angle', distance: 'dynamic pose showing growth and evolution', action: 'emerging stronger, evolving into the next level' },
        lighting: { type: 'dramatic-side', quality: 'light and shadow representing transformation, rebirth through achievement' },
        emotion: 'determined',
        environment: 'modern architectural space with clean lines, glass, reflection surfaces symbolizing growth',
        atmosphere: 'Transformative, ascending, breaking through to new heights'
      }
    ]
  },

  // Modern/Workplace scenes
  modern: {
    revenge: [
      {
        description: 'Elevator power moment',
        camera: { shot: 'medium-shot', angle: 'low-angle', distance: 'in elevator with doors opening to reveal triumph', action: 'stepping out as the victor' },
        lighting: { type: 'dramatic-side', quality: 'harsh fluorescent transforming to warm light, symbolic of victory' },
        emotion: 'confident',
        environment: 'modern office elevator with mirrored walls, floor indicator, doors opening to bright success',
        atmosphere: 'The moment of ascent, leaving doubters below, rising to the top'
      },
      {
        description: 'Presentation that silenced the room',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'at front of presentation screen with charts and graphs', action: 'delivering the brilliant insight that won everyone over' },
        lighting: { type: 'soft-diffused', quality: 'professional presentation lighting, spotlight on you as the expert' },
        emotion: 'confident',
        environment: 'modern conference room with presentation screen, charts, attentive audience in background, tech startup vibe',
        atmosphere: 'Brilliant, expert, undeniable competence, the room is yours'
      }
    ],
    favored: [
      {
        description: 'Casual luxury moment',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'relaxed in modern lifestyle setting', action: 'enjoying modern success casually' },
        lighting: { type: 'golden-hour', quality: 'warm natural light, comfortable and inviting' },
        emotion: 'serene',
        environment: 'modern cafe, boutique, or lifestyle space with trendy decor, plants, natural materials',
        atmosphere: 'Comfortable success, modern lifestyle, effortless achievement'
      }
    ],
    satisfaction: [
      {
        description: 'Morning coffee with victory view',
        camera: { shot: 'medium-shot', angle: 'over-shoulder', distance: 'at window with coffee and city view', action: 'savoring success with morning coffee' },
        lighting: { type: 'golden-hour', quality: 'beautiful morning light, peaceful start to a successful day' },
        emotion: 'serene',
        environment: 'modern apartment or office with large windows, city skyline view, coffee cup, plants',
        atmosphere: 'Peaceful success, enjoying the view from the top'
      }
    ],
    growth: [
      {
        description: 'Learning and evolving in modern workspace',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'at modern desk with tech setup', action: 'mastering new skills, leveling up' },
        lighting: { type: 'soft-diffused', quality: 'clean modern lighting, bright and focused' },
        emotion: 'determined',
        environment: 'modern workspace with multiple monitors, books, notes, plant, organized chaos of growth',
        atmosphere: 'Ascension through learning, becoming more capable every day'
      }
    ]
  },

  // Urban scenes
  urban: {
    revenge: [
      {
        description: 'City night conquest',
        camera: { shot: 'full-body', angle: 'low-angle', distance: 'standing on busy city street at night, lights blurred in background', action: 'owning the city night' },
        lighting: { type: 'neon-glow', quality: 'city lights, neon signs, street lamps creating vibrant urban atmosphere' },
        emotion: 'powerful',
        environment: 'busy city street at night with shops, neon signs, traffic, pedestrians, urban energy',
        atmosphere: 'Urban dominance, night belongs to you, city is your playground'
      },
      {
        description: 'Subway moment of triumph',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'in subway car, doors opening', action: 'arriving at the destination of success' },
        lighting: { type: 'dramatic-side', quality: 'subway lights, reflection in windows, motion blur suggesting speed' },
        emotion: 'confident',
        environment: 'modern subway car with city map, advertisements, reflections, urban transit',
        atmosphere: 'Fast forward, momentum, unstoppable progress toward goals'
      }
    ],
    favored: [
      {
        description: 'Rooftop garden sanctuary',
        camera: { shot: 'wide-shot', angle: 'high-angle', distance: 'in rooftop garden with city view', action: 'peaceful moment above the urban rush' },
        lighting: { type: 'golden-hour', quality: 'warm sunset light over city, garden plants creating peaceful atmosphere' },
        emotion: 'serene',
        environment: 'rooftop garden with plants, seating, city skyline view, escape from urban stress',
        atmosphere: 'Urban oasis, peace above the chaos, sanctuary of success'
      }
    ],
    satisfaction: [
      {
        description: 'Street food victory',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'at street food stall or market', action: 'enjoying simple pleasures after big win' },
        lighting: { type: 'golden-hour', quality: 'warm street lights, food stall glow, vibrant evening atmosphere' },
        emotion: 'serene',
        environment: 'bustling street market or food stall with vendors, signs, urban life, authentic city experience',
        atmosphere: 'Grounded success, enjoying real moments, authentic urban joy'
      }
    ],
    growth: [
      {
        description: 'Running toward the future',
        camera: { shot: 'full-body', angle: 'dynamic-angle', distance: 'running or walking with purpose on city street', action: 'moving forward with determination' },
        lighting: { type: 'dramatic-side', quality: 'dynamic light and shadow, sense of movement and progress' },
        emotion: 'determined',
        environment: 'city street with buildings, crosswalk, urban elements suggesting journey',
        atmosphere: 'Momentum, progress, unstoppable forward motion'
      }
    ]
  },

  // Fantasy/Idealized scenes (tasteful)
  fantasy: {
    revenge: [
      {
        description: 'Throne room of success',
        camera: { shot: 'full-body', angle: 'low-angle', distance: 'standing like royalty in grand hall', action: 'commanding the realm of achievement' },
        lighting: { type: 'dramatic-side', quality: 'majestic lighting creating powerful aura, light streaming from high windows' },
        emotion: 'powerful',
        environment: 'grand hall with pillars, throne or seat of power, opulence suggesting absolute success',
        atmosphere: 'Regal, untouchable, reigning supreme over your domain'
      }
    ],
    favored: [
      {
        description: 'Enchanted garden of success',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'in beautiful garden with flowers and light', action: 'surrounded by beauty and abundance' },
        lighting: { type: 'golden-hour', quality: 'magical warm light filtering through trees, creating enchanted atmosphere' },
        emotion: 'serene',
        environment: 'beautiful garden with flowers, fountain, peaceful nature, dreamlike abundance',
        atmosphere: 'Idyllic, blessed, living in a fairy tale come true'
      }
    ],
    satisfaction: [
      {
        description: 'Mountain peak achievement',
        camera: { shot: 'wide-shot', angle: 'low-angle', distance: 'standing on mountain peak with arms raised', action: 'conquering the summit' },
        lighting: { type: 'golden-hour', quality: 'dramatic sunrise or sunset light, clouds below, golden hour perfection' },
        emotion: 'triumphant',
        environment: 'mountain peak with panoramic view, clouds, sky, sense of limitless horizon',
        atmosphere: 'At the pinnacle, above all obstacles, infinite possibilities'
      }
    ],
    growth: [
      {
        description: 'Butterfly transformation moment',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'in natural setting suggesting transformation', action: 'emerging transformed and beautiful' },
        lighting: { type: 'soft-diffused', quality: 'ethereal light suggesting metamorphosis, glow of new beginning' },
        emotion: 'confident',
        environment: 'natural setting with flowers, butterflies, symbols of transformation and growth',
        atmosphere: 'Metamorphosis, becoming, emerging into something greater'
      }
    ]
  },

  // Ancient/Historical scenes (modern reinterpretation)
  ancient: {
    revenge: [
      {
        description: 'Modern palace of power',
        camera: { shot: 'full-body', angle: 'low-angle', distance: 'in grand modern space with classical elegance', action: 'ruling like an emperor in the modern age' },
        lighting: { type: 'dramatic-side', quality: 'majestic theatrical lighting worthy of imperial presence' },
        emotion: 'powerful',
        environment: 'grand modern space with classical architecture, columns, marble, imperial grandeur',
        atmosphere: 'Imperial majesty, commanding an empire of success'
      }
    ],
    favored: [
      {
        description: 'Imperial garden moment',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'in elegant garden setting', action: 'enjoying imperial leisure' },
        lighting: { type: 'golden-hour', quality: 'perfect warm light in traditional garden' },
        emotion: 'serene',
        environment: 'elegant garden with traditional elements, pavilion, water, rocks, harmony of nature',
        atmosphere: 'Imperial favor, living like royalty, blessed and protected'
      }
    ],
    satisfaction: [
      {
        description: 'Hall of fame induction',
        camera: { shot: 'full-body', angle: 'low-angle', distance: 'standing in grand hall among legends', action: 'taking your place among the greats' },
        lighting: { type: 'dramatic-side', quality: 'spotlight on you among shadows of history' },
        emotion: 'triumphant',
        environment: 'grand hall with statues, plaques, names of legends, sense of history',
        atmosphere: 'Immortalized, joining the pantheon of great achievers'
      }
    ],
    growth: [
      {
        description: 'Scholar\'s study of wisdom',
        camera: { shot: 'medium-shot', angle: 'eye-level', distance: 'among books and artifacts of knowledge', action: 'gaining wisdom that leads to power' },
        lighting: { type: 'candlelight', quality: 'warm light of study, intimate learned atmosphere' },
        emotion: 'thoughtful',
        environment: 'study filled with books, scrolls, artifacts, maps, symbols of accumulated wisdom',
        atmosphere: 'Wisdom seeking, scholar\'s journey to enlightenment and power'
      }
    ]
  }
};

/**
 * Analyze story and generate creative scene based on content
 */
export function analyzeStory(storyText: string): StoryAnalysis {
  const text = storyText.toLowerCase();

  // Determine genre and emotion from story
  const genre = detectGenre(text);
  const emotion = detectEmotion(text);

  // Get creative scene based on genre + emotion combination
  const sceneOptions = CREATIVE_SCENES[genre]?.[emotion] || CREATIVE_SCENES.business.revenge;

  // Select a random scene for variety
  const selectedScene = sceneOptions[Math.floor(Math.random() * sceneOptions.length)];

  return {
    hasFantasyElements: false,
    hasExtremeEmotions: false,
    hasLightingIssues: false,
    hasIdentityAlteration: false,
    suggestedScene: {
      ...selectedScene,
      isSafe: true
    }
  };
}

function detectGenre(text: string): keyof typeof CREATIVE_SCENES {
  if (/商业|合同|谈判|公司|企业|商业|business|contract|corporation/.test(text)) return 'business';
  if (/办公室|会议|职场|同事|公司|office|workplace|meeting/.test(text)) return 'modern';
  if (/城市|街道|广场|公园|urban|city|street|park/.test(text)) return 'urban';
  return 'business'; // Default to business themes
}

function detectEmotion(text: string): keyof typeof CREATIVE_SCENES.business {
  if (/宠爱|霸道|总裁|疼爱|cared|favored|ceo/.test(text)) return 'favored';
  if (/打脸|复仇|报复|revenge|face.*slap/.test(text)) return 'revenge';
  if (/成功|胜利|逆袭|success|victory|triumph/.test(text)) return 'satisfaction';
  return 'growth';
}

/**
 * Build image prompt with STRONG identity lock
 * This is critical - we must preserve the user's exact facial features
 */
export function buildImagePromptWithIdentityLock(scene: Scene, userGender: 'male' | 'female'): string {
  const genderTerm = userGender === 'male' ? 'man' : 'woman';

  // CRITICAL: Identity preservation - this must be very strong
  const identityLock = `
CRITICAL IDENTITY REQUIREMENTS:
1. EXACT SAME FACE as the reference photo - preserve ALL facial features precisely
2. SAME eye shape, eye color, eyebrows, nose, lips, face shape
3. SAME hairstyle and hair color as reference
4. SAME skin tone and complexion
5. Preserve any distinctive features: glasses, freckles, beauty marks, facial hair
6. The face must be RECOGNIZABLE as the SAME PERSON from the reference photo
7. DO NOT change any facial characteristics
8. Match the exact age and appearance from reference photo
`.trim();

  // Scene and environment description
  const sceneDetail = `
SCENE: ${scene.description}

SUBJECT: A ${genderTerm} with the EXACT SAME FACE as the reference photo
ACTION: ${scene.camera.action || 'standing confidently'}

ENVIRONMENT: ${scene.environment}
ATMOSPHERE: ${scene.atmosphere}

CAMERA: ${scene.camera.shot}, ${scene.camera.angle}, ${scene.camera.distance}
LIGHTING: ${scene.lighting.type} - ${scene.lighting.quality}
EMOTION: ${scene.emotion} expression
`.trim();

  // Technical quality specifications
  const technical = `
STYLE: Photorealistic cinematic photography, not AI-generated looking
QUALITY: Ultra detailed, 8K resolution, professional photography
COMPOSITION: Rule of thirds, leading lines, dynamic framing
DEPTH: Shallow depth of field when appropriate, bokeh effect on background
COLOR: Rich, vibrant colors, cinematic color grading
TEXTURE: Fine details in fabric, skin, environment visible
`.trim();

  return `${identityLock}\n\n${sceneDetail}\n\n${technical}`;
}
