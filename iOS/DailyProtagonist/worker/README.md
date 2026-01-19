# Daily Protagonist - Cloudflare Worker

AI image generation backend for the Daily Protagonist iOS app.

## Features

- 🤖 AI image generation (OpenAI DALL-E, Stability AI, or Replicate)
- 💾 Face photo storage for personalized images
- 🔄 Daily caching to reduce API calls
- ⚡ Edge computing with Cloudflare Workers
- 🔒 Secure API key management

## Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser to authenticate with Cloudflare.

### 3. Create KV Namespaces

```bash
# Create cache namespace
npx wrangler kv namespace create "IMAGE_CACHE"

# Create face store namespace
npx wrangler kv namespace create "FACE_STORE"
```

**Important:** Copy the `id` values from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "IMAGE_CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Paste your ID here

[[kv_namespaces]]
binding = "FACE_STORE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Paste your ID here
```

### 4. Set AI API Key

Choose **one** of the following AI providers:

#### Option A: OpenAI DALL-E (Recommended)
```bash
npx wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

#### Option B: Stability AI
```bash
npx wrangler secret put STABILITY_API_KEY
# Paste your Stability AI API key when prompted
```

#### Option C: Replicate
```bash
npx wrangler secret put REPLICATE_API_KEY
# Paste your Replicate API key when prompted
```

### 5. Deploy

```bash
npm run deploy
```

Or:
```bash
npx wrangler deploy
```

You'll see output like:
```
Published daily-protagonist-api.your-subdomain.workers.dev
```

### 6. Update iOS App

Copy your Worker URL and update `Services/DailyImageService.swift`:

```swift
private static let workerBaseURL = "https://daily-protagonist-api.your-subdomain.workers.dev"
```

## API Endpoints

### POST /v1/daily-image

Generate or retrieve today's daily story image.

**Request Body:**
```json
{
  "user_id": "unique-user-uuid",
  "story_text": "Once upon a time...",
  "face_base64": "data:image/jpeg;base64,/9j/4AAQ..." // Only first time
}
```

**Response:**
```json
{
  "date": "2026-01-14",
  "cached": false,
  "image_base64": "data:image/png;base64,iVBORw0KG...",
  "prompt_used": {
    "model": "dall-e-3",
    "prompt": "A cinematic illustration..."
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Testing Locally

```bash
npm run dev
```

Then test with:
```bash
curl -X POST http://localhost:8787/v1/daily-image \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "story_text": "A beautiful sunset over the mountains",
    "face_base64": null
  }'
```

## Monitoring

View real-time logs:

```bash
npm run tail
```

Or:
```bash
npx wrangler tail
```

## Troubleshooting

### Error: "No face photo found"

- First call must include `face_base64` with a photo
- Subsequent calls can omit it (it's stored)

### Error: "No AI API key configured"

- Make sure you set one of: `OPENAI_API_KEY`, `STABILITY_API_KEY`, or `REPLICATE_API_KEY`

### Worker not deploying

- Check that you're logged in: `npx wrangler whoami`
- Verify KV namespace IDs are correct in `wrangler.toml`
- Check Cloudflare dashboard for Worker errors

## Cost

- **Cloudflare Workers Free Tier:** 100,000 requests/day
- **KV Storage:** $0.50 per million reads/month
- **AI API:** Depends on provider
  - OpenAI DALL-E: ~$0.04 per image
  - Stability AI: ~$0.02 per image
  - Replicate: Varies by model

## Architecture

```
iOS App → Cloudflare Worker → AI API (DALL-E/SDXL/etc.)
                    ↓
              KV Storage (Cache & Face Photos)
                    ↓
              Returns generated image
```
