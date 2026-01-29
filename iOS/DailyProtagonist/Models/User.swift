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
        // Western Genres (New)
        case romance = "Romance"
        case darkRomance = "Dark Romance"
        case fantasyRomance = "Fantasy Romance"
        case newAdult = "New Adult"
        case tabooRomance = "Taboo Romance"
        case romanticComedy = "Romantic Comedy"
        case celebrityRomance = "Celebrity Romance"
        case forbiddenRomance = "Forbidden Romance"
        case business = "Business"
        case personalGrowth = "Personal Growth"
        case lifestyle = "Lifestyle"
        case career = "Career"
        case travel = "Travel"

        // Legacy Genres (Chinese 爽文)
        case modern = "modern"
        case ancient = "ancient"
        case fantasy = "fantasy"
        case urban = "urban"

        var displayName: String {
            switch self {
            // Western Genres
            case .romance: return "Romance"
            case .darkRomance: return "Dark Romance"
            case .fantasyRomance: return "Fantasy Romance"
            case .newAdult: return "New Adult"
            case .tabooRomance: return "Taboo Romance"
            case .romanticComedy: return "Romantic Comedy"
            case .celebrityRomance: return "Celebrity Romance"
            case .forbiddenRomance: return "Forbidden Romance"
            case .business: return "Business Empire"
            case .personalGrowth: return "Personal Growth"
            case .lifestyle: return "Luxury Life"
            case .career: return "Career Success"
            case .travel: return "World Travel"
            // Legacy Genres
            case .modern: return "Workplace Counterattack"
            case .ancient: return "Modern Urban"
            case .fantasy: return "Urban Rise"
            case .urban: return "Urban Success"
            }
        }
    }

    enum Emotion: String, Codable, CaseIterable {
        // Western Emotions (New)
        case revenge = "Revenge"
        case darkPassion = "Dark Passion"
        case secondChance = "Second Chance"
        case enemiesToLovers = "Enemies to Lovers"
        case dangerousLove = "Dangerous Love"
        case forbiddenLove = "Forbidden Love"
        case slowBurn = "Slow Burn"
        case wishFulfillment = "Wish Fulfillment"
        case forbiddenDesire = "Forbidden Desire"
        case academicRomance = "Academic Romance"
        case loyaltyVsLove = "Loyalty vs Love"
        case arrangedMarriage = "Arranged Marriage"
        case bossEmployee = "Boss-Employee"
        case captorCaptive = "Captor-Captive"
        case bodySwap = "Body Swap"
        case reunion = "Reunion"
        case ambition = "Ambition"
        case empowerment = "Empowerment"
        case adventure = "Adventure"
        case aspiration = "Aspiration"
        case determination = "Determination"

        // Legacy Emotions (Chinese 爽文)
        case favored = "favored"
        case satisfaction = "satisfaction"
        case growth = "growth"

        var displayName: String {
            switch self {
            // Western Emotions
            case .revenge: return "Sweet Revenge"
            case .darkPassion: return "Dark Passion"
            case .secondChance: return "Second Chance"
            case .enemiesToLovers: return "Enemies to Lovers"
            case .dangerousLove: return "Dangerous Love"
            case .forbiddenLove: return "Forbidden Love"
            case .slowBurn: return "Slow Burn"
            case .wishFulfillment: return "Wish Fulfillment"
            case .forbiddenDesire: return "Forbidden Desire"
            case .academicRomance: return "Academic Romance"
            case .loyaltyVsLove: return "Loyalty vs Love"
            case .arrangedMarriage: return "Arranged Marriage"
            case .bossEmployee: return "Boss-Employee"
            case .captorCaptive: return "Captor-Captive"
            case .bodySwap: return "Body Swap"
            case .reunion: return "Reunion"
            case .ambition: return "Ambition"
            case .empowerment: return "Empowerment"
            case .adventure: return "Adventure"
            case .aspiration: return "Aspiration"
            case .determination: return "Determination"
            // Legacy Emotions
            case .favored: return "CEO Doting"
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
