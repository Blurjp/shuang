# Scene-Based Image Generation Strategy

## Overview

This document describes the improved image generation pipeline that produces photorealistic images of the user based on story content, with identity consistency as the highest priority.

## Architecture

### Two-Step Process

```
Story Text → Scene Analysis → Image Generation
           (Step 1)           (Step 2)
```

**Step 1: Story → Scene Transformation**
- Analyzes raw story text for safety and renderability
- Transforms story into structured scene with camera, lighting, emotion specs
- Falls back to safe defaults for unsafe/fantasy content

**Step 2: Scene → Image Generation**
- Uses OpenAI Image Edit API (`dall-e-2`) with reference photo
- Applies Identity Lock to preserve exact facial features
- Falls back to DALL-E if no photo or unsafe scene

## Files

| File | Purpose |
|------|---------|
| `src/services/sceneGenerator.ts` | Story analysis and scene generation |
| `src/services/openaiImageEdit.ts` | OpenAI Image Edit API wrapper |
| `src/utils/imageDownloader.ts` | Downloads images to temp files |
| `src/services/contentGenerator.ts` | Main orchestration (updated) |

## Scene Structure

```typescript
interface Scene {
  description: string;        // Core scene description
  camera: {
    shot: 'medium-close-up' | 'close-up' | 'portrait';
    angle: 'eye-level';
    distance: string;
  };
  lighting: {
    type: 'natural-daylight' | 'soft-indoor' | 'overcast' | 'golden-hour';
    direction: 'front' | 'side' | 'diffused';
  };
  emotion: 'calm' | 'thoughtful' | 'focused' | 'subtle-smile' | 'confident';
  environment: string;        // Realistic contemporary setting
  isSafe: boolean;            // Can this be rendered photorealistically?
  unsafeReason?: string;
}
```

## Forbidden Patterns (Auto-Detected)

| Category | Patterns (Chinese/English) | Action |
|----------|---------------------------|--------|
| Fantasy | 魔法, 修仙, 异世界, magic, fantasy, supernatural | Rewrite to safe scene |
| Extreme Lighting | 霓虹, 火焰, 舞台, neon, firelight, stage | Rewrite to safe scene |
| Extreme Emotions | 怒吼, 咆哮, 痛苦, rage, screaming, agony | Rewrite to safe scene |
| Identity Alteration | 变老, 变性, 换脸, age change, gender change | Skip image generation |
| Bad Shots | 全身, 远景, full body, distant shot | Use close-up instead |

## Examples

### Example 1: Safe Business Story

**Input Story:**
```
会议室的门被推开，所有人屏息以待。你从容地走进去，将那份价值十亿的合同放在桌上。
曾经质疑你的声音此刻全部消失，取而代之的是敬佩的眼神。
```

**Step 1 - Story Analysis:**
```
✅ Has fantasy elements: NO
✅ Has extreme emotions: NO
✅ Has lighting issues: NO
✅ Has identity alteration: NO
✅ Scene is SAFE
```

**Generated Scene:**
```json
{
  "description": "A professional in a modern office environment",
  "camera": {
    "shot": "medium-close-up",
    "angle": "eye-level",
    "distance": "chest-up, neutral background"
  },
  "lighting": {
    "type": "soft-indoor",
    "direction": "diffused"
  },
  "emotion": "confident",
  "environment": "clean, well-lit office or meeting room, neutral wall or window",
  "isSafe": true
}
```

**Final Image Prompt (with Identity Lock):**
```
IDENTITY LOCK (CRITICAL):
- This must be a photograph of the exact same person from the reference image
- NO beautification, idealization, or enhancement
- Keep ALL facial features exactly as they appear in the reference photo
- Do NOT make the person look more handsome/beautiful than they are
- The person must look like a REAL photograph, not a model

SCENE:
- A confident man in clean, well-lit office or meeting room, neutral wall or window
- chest-up, neutral background shot, eye-level angle
- soft-indoor lighting, diffused light direction
- Photorealistic style, looks like a real photograph

TECHNICAL:
- Shot type: medium-close-up
- Camera: eye-level, standard lens
- Lighting: soft, even lighting on face
- Style: photorealistic, documentary-style
- NO artistic filters, NO stylization

FORBIDDEN:
- NO face distortion, NO face alteration
- NO idealized features, NO model-like appearance
- NO beautification or enhancement
- NO stylization, NO artistic effects
```

**Result:** Photorealistic medium-close-up of user in office setting, exact face preserved.

---

### Example 2: Unsafe Fantasy Story

**Input Story:**
```
你猛然推开厅门，周身散发着淡淡的金色光芒，体内的灵气如江河般奔涌。这便是你突破元婴期的那一刻，
天地变色，雷声滚滚，所有修仙者都跪伏在地。
```

**Step 1 - Story Analysis:**
```
❌ Has fantasy elements: YES (修仙, 灵气, 元婴期)
❌ Scene is UNSAFE
Reason: fantasy/supernatural
```

**Action:** Rewrite to safe fallback scene

**Generated Scene (fallback):**
```json
{
  "description": "A person in a moment of quiet accomplishment",
  "camera": {
    "shot": "medium-close-up",
    "angle": "eye-level",
    "distance": "chest-up with simple background"
  },
  "lighting": {
    "type": "natural-daylight",
    "direction": "front"
  },
  "emotion": "subtle-smile",
  "environment": "indoor space with natural light, minimal background elements",
  "isSafe": false,
  "unsafeReason": "fantasy/supernatural"
}
```

**Result:** Safe indoor scene instead of fantasy elements, uses DALL-E fallback (no identity).

---

### Example 3: Outdoor Success Story

**Input Story:**
```
夜幕降临，城市的霓虹灯在你脚下闪烁。你站在顶层公寓的落地窗前，回想一路走来的艰辛。
那些曾经的嘲笑和质疑，如今都成了你成功的注脚。你轻轻举起酒杯，敬自己，也敬这个属于你的时代。
```

**Step 1 - Story Analysis:**
```
⚠️  Has lighting issues: YES (霓虹 - neon lights)
❌ Scene is UNSAFE
```

**Action:** Rewrite to safe scene (remove neon, keep nighttime/indoors)

**Generated Scene (safe rewrite):**
```json
{
  "description": "A person in a moment of quiet reflection",
  "camera": {
    "shot": "close-up",
    "angle": "eye-level",
    "distance": "shoulders-up, shallow depth of field"
  },
  "lighting": {
    "type": "soft-indoor",
    "direction": "diffused"
  },
  "emotion": "thoughtful",
  "environment": "interior space near window or simple wall, soft natural light",
  "isSafe": true
}
```

**Result:** Indoor reflection scene instead of neon cityscape.

---

## API Configuration

### Required Environment Variables

```bash
# OpenAI API for image generation
IMAGE_API_KEY=sk-...
IMAGE_API_URL=https://api.openai.com/v1/images/generations

# For Image Edit API (identity preservation)
# Uses same API key as above
```

### API Endpoints Used

| Endpoint | Model | Purpose |
|----------|-------|---------|
| `POST /v1/images/edits` | `gpt-image-1` | Image edit with reference (identity) |
| `POST /v1/images/generations` | `dall-e-3` | Text-to-image (fallback) |

### Image Parameters

```typescript
// Image Edit API (with identity)
{
  model: 'gpt-image-1',
  prompt: string,           // With Identity Lock
  image: File,              // Reference photo
  mask: File,               // Change mask (same as image for MVP)
  n: 1,
  size: '1024x1536'         // Portrait orientation
}

// DALL-E fallback (no identity)
{
  model: 'dall-e-3',
  prompt: string,           // With Identity Lock
  n: 1,
  size: '1024x1024',
  quality: 'standard'
}
```

## Prompt Structure

### Identity Lock Section (Highest Priority)

```
IDENTITY LOCK (CRITICAL):
- This must be a photograph of the exact same person from the reference image
- NO beautification, idealization, or enhancement
- Keep ALL facial features exactly as they appear in the reference photo
- Same face shape, same eyes, same nose, same mouth, same skin texture
- Do NOT change facial structure, skin tone, or age
- The person must look like a REAL photograph, not a model or idealized version
```

### Scene Description

```
SCENE:
- A [emotion] [man/woman] in [environment]
- [distance] shot, [angle] angle
- [lighting type] lighting, [direction] light direction
- Photorealistic style, looks like a real photograph taken with a phone or camera
```

### Technical Specifications

```
TECHNICAL:
- Shot type: [medium-close-up / close-up / portrait]
- Camera: eye-level, standard lens (no wide angle or telephoto compression)
- Lighting: soft, even lighting on face (no harsh shadows)
- Style: photorealistic, documentary-style photography
- NO artistic filters, NO stylization, NO fantasy elements
```

### Negative Prompt

```
FORBIDDEN:
- NO face distortion, NO face alteration
- NO idealized features, NO model-like appearance
- NO beautification or enhancement
- NO stylization, NO artistic effects
- NO fantasy elements, NO magical or supernatural content
- NO extreme lighting (neon, fire, dramatic contrast)
- NO full-body shots, NO distant shots
- NO extreme emotions (rage, screaming, agony)
```

## Implementation Details

### Step 1: Story Analysis (sceneGenerator.ts)

```typescript
function analyzeStory(storyText: string): StoryAnalysis {
  // Check for forbidden patterns
  const hasFantasyElements = FORBIDDEN_PATTERNS.fantasy.some(p =>
    text.includes(p)
  );

  // Generate safe scene based on context
  const suggestedScene = generateSafeScene(storyText);

  return {
    hasFantasyElements,
    hasExtremeEmotions,
    hasLightingIssues,
    hasIdentityAlteration,
    suggestedScene: {
      ...suggestedScene,
      isSafe: !hasFantasyElements && !hasLightingIssues && ...
    }
  };
}
```

### Step 2: Image Generation (contentGenerator.ts)

```typescript
async generateImage(storyText: string, user: User, userPhotoUrl?: string) {
  // Step 1: Analyze story and generate scene
  const analysis = analyzeStory(storyText);
  const scene = analysis.suggestedScene;

  // Step 2: Choose API based on safety and photo availability
  if (userPhotoUrl && scene.isSafe) {
    // Use OpenAI Image Edit API with reference
    return await openaiImageEditService.generateImageWithIdentity(
      userPhotoUrl,
      scene,
      user.gender
    );
  } else {
    // Fall back to DALL-E
    return await openaiImageEditService.generateImageWithoutIdentity(
      scene,
      user.gender
    );
  }
}
```

## Benefits

1. **Identity Consistency**: Uses reference photo with OpenAI Image Edit API
2. **Safety First**: Detects and rewrites unsafe scenes automatically
3. **Reliability**: Falls back gracefully when reference photo unavailable
4. **Cost Predictable**: Single image per story, no retries needed
5. **Production Ready**: Simple, structured approach, easy to debug

## Limitations

1. **MVP Mask**: Currently uses same image as mask (allows changes everywhere)
2. **No Multiple Photos**: Uses only one reference photo
3. **Fallback Quality**: DALL-E fallback doesn't preserve identity
4. **Scene Simplification**: Complex stories reduced to simple scenes

## Future Improvements

1. **Proper Mask Generation**: Create masks that only allow scene changes
2. **Multiple Reference Photos**: Use 2-4 photos for better identity
3. **Scene Variations**: Generate 2-3 scene options per story
4. **User Preferences**: Allow users to adjust camera/lighting preferences
5. **Quality Metrics**: Track identity similarity scores

## Testing

### Test Case 1: Safe Business Story
```bash
# Story: Office meeting, signing contract
# Expected: Indoor office scene, medium-close-up, confident emotion
# API: OpenAI Image Edit with reference photo
# Result: User's face in office setting
```

### Test Case 2: Fantasy Story
```bash
# Story: Cultivation breakthrough, magical powers
# Expected: Rewrite to safe indoor scene
# API: DALL-E fallback (no identity)
# Result: Generic person in indoor setting
```

### Test Case 3: No Reference Photo
```bash
# Story: Any story
# Expected: Scene generation still works
# API: DALL-E fallback (no identity)
# Result: Generic person matching scene description
```

## Monitoring

Add these logs for production monitoring:

```
=== STEP 1: Story → Scene Transformation ===
🎭 Scene: [description]
📐 Camera: [shot], [angle]
💡 Lighting: [type]
😊 Emotion: [emotion]
⚠️  Unsafe: [reason if unsafe]

=== STEP 2: Image Generation ===
✅ Using OpenAI Image Edit API with reference photo...
OR ⚠️  No valid photo, using DALL-E fallback
OR ⚠️  Scene unsafe, using DALL-E fallback
✅ Image generated: [URL]
```

## Deployment Checklist

- [ ] Add `gpt-image-1` model access to OpenAI API key
- [ ] Test form-data multipart upload works in production
- [ ] Verify temp file cleanup (avoid disk space issues)
- [ ] Monitor Image Edit API success rate
- [ ] Set up alerts for unsafe story detection rate
- [ ] Document scene rewrite patterns for content review
