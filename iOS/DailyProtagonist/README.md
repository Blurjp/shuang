# Daily Protagonist - iOS App

iOS app for Daily Protagonist (每日主角) - A daily storytelling app that delivers personalized content.

## Tech Stack

- **Language**: Swift
- **Framework**: SwiftUI
- **Architecture**: MVVM
- **iOS Version**: iOS 17+

## Project Structure

```
DailyProtagonist/
├── Models/                  # Data models
│   ├── User.swift          # User model and auth types
│   └── DailyContent.swift  # Content model and feedback types
│
├── Views/                   # SwiftUI views
│   ├── AuthView.swift      # Login/Registration view
│   ├── OnboardingView.swift  # First-time setup flow
│   ├── MainTabView.swift   # Main tab container
│   ├── TodayView.swift     # Today's content view
│   ├── HistoryView.swift   # History list view
│   └── ProfileView.swift   # User profile and settings
│
├── ViewModels/              # View models (MVVM)
│   ├── AuthManager.swift   # Authentication state management
│   ├── TodayViewModel.swift
│   ├── HistoryViewModel.swift
│   └── ProfileViewModel.swift
│
├── Services/                # Business logic
│   ├── APIService.swift    # REST API client
│   └── PushNotificationManager.swift  # Push notifications
│
└── DailyProtagonist/
    ├── DailyProtagonistApp.swift  # App entry point
    ├── ContentView.swift    # Root view
    ├── AppDelegate.swift    # Push notification delegate
    └── Info.plist          # App configuration
```

## Features

### 1. Authentication
- Email login/registration
- Anonymous login
- Persistent session with UserDefaults

### 2. Onboarding
- 3-step preference selection flow
- Gender selection (Male/Female)
- Genre preference (Modern/Ancient/Fantasy/Urban/Business)
- Emotion preference (Favored/Revenge/Satisfaction/Growth)

### 3. Today Tab
- Display today's content
- Story text and image
- Feedback buttons (Like/Neutral/Dislike)
- Pull to refresh

### 4. History Tab
- Last 7 days of content
- Content preview list
- Detail view for each item

### 5. Profile Tab
- User preferences display
- Edit preferences
- Logout

## Setup

### Prerequisites

1. Xcode 15+
2. iOS 17+ SDK
3. CocoaPods (if using dependencies)

### Installation

1. Clone this repository
2. Open `DailyProtagonist.xcodeproj` in Xcode
3. Update the API base URL in `APIService.swift`:

```swift
private let baseURL = "http://localhost:3000/api"  // Development
// private let baseURL = "https://your-api-domain.com/api"  // Production
```

4. Build and run (Cmd + R)

## Push Notifications Setup

### 1. Enable Push Notifications in Xcode

1. Select your project in the navigator
2. Choose your target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"

### 2. Configure Push Notification Key

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Create a Push Notification Key
3. Download the key
4. Add the key to your project (or configure in backend)

### 3. Backend Integration

The app automatically registers the device token with the backend when push notifications are enabled.

## API Integration

The app communicates with the backend API using the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register/Login |
| `/api/user/onboarding` | POST | Complete onboarding |
| `/api/user/preferences` | GET/PUT | User preferences |
| `/api/user/push-token` | POST | Register push token |
| `/api/content/today` | GET | Get today's content |
| `/api/content/history` | GET | Get content history |
| `/api/content/:id` | GET | Get specific content |
| `/api/feedback` | POST | Submit feedback |

## Development Notes

### State Management

The app uses `@StateObject` and `@EnvironmentObject` for state management:

- `AuthManager`: Authentication state (injected at app level)
- `PushNotificationManager`: Push notification state (injected at app level)
- Individual ViewModels for each view

### Navigation

- Uses SwiftUI `NavigationStack`
- Tab-based navigation for main sections
- Sheet presentations for detail views

### Data Persistence

- User preferences stored in UserDefaults
- Auth token persisted for session management
- No local database (MVP - data fetched from API)

## Testing

To test with the local backend:

1. Make sure your backend is running on `http://localhost:3000`
2. Use iOS Simulator or physical device
3. For physical device testing, update the baseURL to your local IP address

```swift
private let baseURL = "http://192.168.1.x:3000/api"
```

## Build Configuration

### Development

- Uses local backend
- Debug logging enabled
- No code obfuscation

### Production

Before releasing:

1. Update `baseURL` to production API
2. Enable code signing and provisioning profiles
3. Disable debug logging
4. Test push notifications in production environment

## Troubleshooting

### "Network connection lost" error

- Check that the backend is running
- Verify the `baseURL` is correct
- For physical devices, use your local IP address

### Push notifications not working

- Verify Push Notifications capability is enabled
- Check that the backend receives the device token
- Test with a real device (simulator has limited support)

### App crashes on launch

- Check iOS version (requires iOS 17+)
- Verify all files are included in the target
- Check Xcode console for error messages

## Future Enhancements

- [ ] Widget support for quick access
- [ ] App icon customization
- [ ] Dark mode support
- [ ] Haptic feedback
- [ ] Animation improvements
- [ ] Offline caching
- [ ] Share functionality
