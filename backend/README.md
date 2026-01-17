# Daily Protagonist Backend API

Backend API for Daily Protagonist mobile app.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
backend/
├── src/
│   ├── models/        # Database models and initialization
│   ├── routes/        # API route handlers
│   ├── middleware/    # Express middleware (auth)
│   ├── services/      # Business logic (content generation)
│   ├── workers/       # Background jobs (daily content generation)
│   ├── utils/         # Utility functions
│   └── index.ts       # Application entry point
├── data/              # SQLite database (created at runtime)
├── .env               # Environment variables
├── tsconfig.json      # TypeScript configuration
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API keys:
   - `JWT_SECRET`: Generate a random string
   - `LLM_API_KEY`: Your OpenAI API key (or compatible)
   - `IMAGE_API_KEY`: Your image generation API key

4. Initialize database:
```bash
npm run db:init
```

## Running

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

#### Register / Login
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com"  // optional, use anonymous_id for anonymous users
}

// Response
{
  "user_id": "uuid",
  "token": "jwt-token"
}
```

### User Preferences

#### Onboarding (set initial preferences)
```http
POST /api/user/onboarding
Authorization: Bearer <token>
Content-Type: application/json

{
  "gender": "male",
  "genre_preference": "modern",
  "emotion_preference": "growth"
}
```

#### Get preferences
```http
GET /api/user/preferences
Authorization: Bearer <token>
```

#### Update preferences
```http
PUT /api/user/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "gender": "female",
  "genre_preference": "fantasy"
}
```

#### Register push token
```http
POST /api/user/push-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "ios",
  "token": "device-push-token"
}
```

### Content

#### Get today's content
```http
GET /api/content/today
Authorization: Bearer <token>

// Response
{
  "id": "uuid",
  "text": "故事内容...",
  "image_url": "https://...",
  "date": "2025-01-12",
  "delivered_at": "2025-01-12T08:00:00Z",
  "feedback": "like"
}
```

#### Get history (last 7 days)
```http
GET /api/content/history?days=7
Authorization: Bearer <token>
```

#### Get specific content
```http
GET /api/content/:id
Authorization: Bearer <token>
```

### Feedback

#### Submit feedback
```http
POST /api/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "content_id": "uuid",
  "rating": "like"  // "like" | "neutral" | "dislike"
}
```

## Background Worker

Generate daily content for all users:
```bash
npm run worker generate-all
```

Generate content for a specific user (for testing):
```bash
npm run worker generate-user <user-id>
```

## Cron Job Setup

Set up a cron job to generate content daily at midnight:

```bash
# Edit crontab
crontab -e

# Add this line (runs at 00:00 every day)
0 0 * * * cd /path/to/backend && npm run worker generate-all
```

## Data Models

### User
- `id`: UUID (primary key)
- `email`: Email address (optional, unique)
- `anonymous_id`: Anonymous identifier (optional, unique)
- `gender`: 'male' | 'female'
- `genre_preference`: 'modern' | 'ancient' | 'fantasy' | 'urban' | 'business'
- `emotion_preference`: 'favored' | 'revenge' | 'satisfaction' | 'growth'
- `push_token_ios`: iOS push notification token
- `push_token_android`: Android push notification token
- `is_onboarded`: Boolean (0 or 1)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### DailyContent
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to users)
- `text`: Story content (80-500 characters)
- `image_url`: URL to generated image
- `date`: Date (YYYY-MM-DD format)
- `delivered_at`: Timestamp when delivered
- `created_at`: Timestamp
- Unique constraint on (user_id, date)

### Feedback
- `id`: UUID (primary key)
- `content_id`: UUID (foreign key to daily_contents)
- `rating`: 'like' | 'neutral' | 'dislike'
- `created_at`: Timestamp
- Unique constraint on content_id

## Health Check

```bash
curl http://localhost:3000/health
```
