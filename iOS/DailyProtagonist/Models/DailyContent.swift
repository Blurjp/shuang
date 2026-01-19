import Foundation

struct DailyContent: Codable, Identifiable {
    let id: String
    let text: String
    let imageUrl: String
    let date: String // YYYY-MM-DD format
    let deliveredAt: Date?
    var feedback: FeedbackRating?

    enum CodingKeys: String, CodingKey {
        case id
        case text
        case imageUrl = "image_url"
        case date
        case deliveredAt = "delivered_at"
        case feedback
    }

    var displayDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: date) {
            formatter.dateStyle = .medium
            formatter.locale = Locale(identifier: "zh_CN")
            return formatter.string(from: date)
        }
        return date
    }
}

struct ContentPreview: Codable, Identifiable {
    let id: String
    let textPreview: String
    let imageUrl: String
    let date: String
    let feedback: FeedbackRating?

    enum CodingKeys: String, CodingKey {
        case id
        case textPreview = "text_preview"
        case imageUrl = "image_url"
        case date
        case feedback
    }

    var displayDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: date) {
            formatter.dateStyle = .medium
            formatter.locale = Locale(identifier: "zh_CN")
            return formatter.string(from: date)
        }
        return date
    }
}

enum FeedbackRating: String, Codable {
    case like = "like"
    case neutral = "neutral"
    case dislike = "dislike"

    var icon: String {
        switch self {
        case .like: return "👍"
        case .neutral: return "😐"
        case .dislike: return "👎"
        }
    }
}

struct FeedbackRequest: Codable {
    let contentId: String
    let rating: FeedbackRating

    enum CodingKeys: String, CodingKey {
        case contentId = "content_id"
        case rating
    }
}

struct PushTokenRequest: Codable {
    let platform: String
    let token: String
}

// Response when no content is available
struct NoContentResponse: Codable {
    let error: String
    let canGenerate: Bool
    let isPremium: Bool
    let remainingGenerations: Int
}
