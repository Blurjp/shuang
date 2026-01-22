import Foundation

struct User: Codable {
    let id: String
    var email: String?
    var anonymousId: String?
    var gender: Gender?
    var genrePreference: Genre?
    var emotionPreference: Emotion?
    var pushTokenIos: String?
    var isOnboarded: Bool
    let createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case anonymousId = "anonymous_id"
        case gender
        case genrePreference = "genre_preference"
        case emotionPreference = "emotion_preference"
        case pushTokenIos = "push_token_ios"
        case isOnboarded = "is_onboarded"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    enum Gender: String, Codable, CaseIterable {
        case male = "male"
        case female = "female"

        var displayName: String {
            switch self {
            case .male: return "Male"
            case .female: return "Female"
            }
        }
    }

    enum Genre: String, Codable, CaseIterable {
        case modern = "modern"
        case ancient = "ancient"
        case fantasy = "fantasy"
        case urban = "urban"
        case business = "business"

        var displayName: String {
            switch self {
            case .modern: return "Workplace Counterattack"
            case .ancient: return "Modern Urban"
            case .fantasy: return "Urban Rise"
            case .urban: return "Urban Success"
            case .business: return "Business Warfare"
            }
        }
    }

    enum Emotion: String, Codable, CaseIterable {
        case favored = "favored"
        case revenge = "revenge"
        case satisfaction = "satisfaction"
        case growth = "growth"

        var displayName: String {
            switch self {
            case .favored: return "CEO Doting"
            case .revenge: return "Face-Slapping Revenge"
            case .satisfaction: return "Triumphant Rise"
            case .growth: return "Power Level Up"
            }
        }
    }
}

struct RegisterRequest: Codable {
    let email: String?
    let anonymousId: String?

    enum CodingKeys: String, CodingKey {
        case email
        case anonymousId = "anonymous_id"
    }
}

struct LoginRequest: Codable {
    let email: String
}

struct RegisterResponse: Codable {
    let userId: String
    let token: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case token
    }
}

struct OnboardingRequest: Codable {
    let gender: User.Gender
    let genrePreference: User.Genre
    let emotionPreference: User.Emotion

    enum CodingKeys: String, CodingKey {
        case gender
        case genrePreference = "genre_preference"
        case emotionPreference = "emotion_preference"
    }
}

struct UserPreferences: Codable {
    let gender: User.Gender
    let genrePreference: User.Genre
    let emotionPreference: User.Emotion

    enum CodingKeys: String, CodingKey {
        case gender
        case genrePreference = "genre_preference"
        case emotionPreference = "emotion_preference"
    }
}

struct UpdatePreferencesRequest: Codable {
    let gender: User.Gender?
    let genrePreference: User.Genre?
    let emotionPreference: User.Emotion?

    enum CodingKeys: String, CodingKey {
        case gender
        case genrePreference = "genre_preference"
        case emotionPreference = "emotion_preference"
    }
}

struct SuccessResponse: Codable {
    let success: Bool
}

struct UserPhoto: Codable, Identifiable {
    let id: String
    let photoUrl: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case photoUrl = "photo_url"
        case createdAt = "created_at"
    }
}

struct PhotoUploadResponse: Codable {
    let id: String
    let photoUrl: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case photoUrl = "photo_url"
        case createdAt = "created_at"
    }
}

// MARK: - Subscription Models

struct SubscriptionStatusRequest: Codable {
    let isPremium: Bool
    let expirationDate: Date?

    enum CodingKeys: String, CodingKey {
        case isPremium = "is_premium"
        case expirationDate = "expiration_date"
    }
}

struct SubscriptionStatus: Codable {
    let isPremium: Bool
    let expirationDate: Date?
    let autoRenewEnabled: Bool?

    enum CodingKeys: String, CodingKey {
        case isPremium = "is_premium"
        case expirationDate = "expiration_date"
        case autoRenewEnabled = "auto_renew_enabled"
    }
}
