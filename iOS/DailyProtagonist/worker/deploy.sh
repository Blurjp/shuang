#!/bin/bash

# Daily Protagonist Worker Deployment Script

set -e

echo "🚀 Daily Protagonist Worker Deployment"
echo "======================================"
echo ""

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx not found. Please install Node.js first."
    exit 1
fi

# Check if logged in
echo "📋 Checking Cloudflare authentication..."
if ! npx wrangler whoami &> /dev/null; then
    echo "🔐 Not logged in. Opening browser for authentication..."
    npx wrangler login
fi

echo "✅ Authenticated with Cloudflare"
echo ""

# Check KV namespaces
echo "📦 Checking KV namespaces..."
IMAGE_CACHE_ID=$(grep -A 2 'binding = "IMAGE_CACHE"' wrangler.toml | grep "id = " | cut -d'"' -f2 | head -1)
FACE_STORE_ID=$(grep -A 2 'binding = "FACE_STORE"' wrangler.toml | grep "id = " | cut -d'"' -f2 | head -1)

if [[ "$IMAGE_CACHE_ID" == "YOUR_IMAGE_CACHE_ID" ]] || [[ "$FACE_STORE_ID" == "YOUR_FACE_STORE_ID" ]]; then
    echo "⚠️  KV namespaces not configured. Creating them now..."
    echo ""
    echo "Creating IMAGE_CACHE namespace..."
    npx wrangler kv namespace create "IMAGE_CACHE" || true
    echo ""
    echo "Creating FACE_STORE namespace..."
    npx wrangler kv namespace create "FACE_STORE" || true
    echo ""
    echo "⚠️  Please update wrangler.toml with the namespace IDs above, then run this script again."
    exit 1
fi

echo "✅ KV namespaces configured"
echo ""

# Check for API key
echo "🔑 Checking AI API key..."
if ! npx wrangler secret list | grep -q "OPENAI_API_KEY\|STABILITY_API_KEY\|REPLICATE_API_KEY"; then
    echo "⚠️  No AI API key found. Please set one:"
    echo "   npx wrangler secret put OPENAI_API_KEY"
    echo ""
    read -p "Press Enter after setting your API key, or Ctrl+C to cancel..."
fi

echo "✅ API key configured"
echo ""

# Deploy
echo "🚀 Deploying Worker to Cloudflare..."
npx wrangler deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy your Worker URL from above"
echo "   2. Update Services/DailyImageService.swift:"
echo "      private static let workerBaseURL = \"https://YOUR_WORKER_URL\""
echo ""
