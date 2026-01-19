import Foundation

/// Service for calling Cloudflare Worker to generate daily story images
struct DailyImageService {

    private static let workerBaseURL = "https://daily-protagonist-api.blurjp.workers.dev"

    // MARK: - Public API

    /// Fetches or generates the daily image for a story
    /// - Parameters:
    ///   - storyText: The story text (will be truncated if too long)
    ///   - faceBase64: Optional face photo data URL (only needed first time)
    /// - Returns: DailyImageResult with the generated image
    func fetchDailyImage(storyText: String, faceBase64: String? = nil) async throws -> DailyImageResult {

        // Truncate story text to reasonable length (API limit consideration)
        let maxStoryLength = 2000
        let truncatedStory = String(storyText.prefix(maxStoryLength))

        // Get user ID
        let userId = UserIdentifierManager.shared.getUserId()

        // Build request
        let request = DailyImageRequest(
            userId: userId,
            storyText: truncatedStory,
            faceBase64: faceBase64
        )

        // Make API call
        let url = URL(string: "\(Self.workerBaseURL)/v1/daily-image")!
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.timeoutInterval = 60 // Image generation can take time

        // Encode request body
        let encoder = JSONEncoder()
        urlRequest.httpBody = try encoder.encode(request)

        // Perform request
        let (data, response) = try await URLSession.shared.data(for: urlRequest)

        // Validate response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw DailyImageError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw DailyImageError.httpError(httpResponse.statusCode)
        }

        // Decode response
        let decoder = JSONDecoder()
        let result = try decoder.decode(DailyImageResult.self, from: data)

        return result
    }
}

// MARK: - Models

struct DailyImageRequest: Codable {
    let userId: String
    let storyText: String
    let faceBase64: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case storyText = "story_text"
        case faceBase64 = "face_base64"
    }
}

struct DailyImageResult: Codable {
    let date: String
    let cached: Bool
    let imageBase64: String
    let promptUsed: PromptUsed?

    enum CodingKeys: String, CodingKey {
        case date
        case cached
        case imageBase64 = "image_base64"
        case promptUsed = "prompt_used"
    }
}

struct PromptUsed: Codable {
    // The structure depends on what the Worker returns
    // Keeping it flexible for now
}

// MARK: - Errors

enum DailyImageError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case decodingFailed
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response"
        case .httpError(let code):
            return "Network error (\(code))"
        case .decodingFailed:
            return "Failed to decode data"
        case .networkError(let message):
            return "Network connection failed: \(message)"
        }
    }
}

// MARK: - User Identifier Manager

/// Manages stable user ID across app launches using Keychain
class UserIdentifierManager {

    static let shared = UserIdentifierManager()

    private struct Keys {
        static let userId = "daily_protagonist_user_id"
        static let service = "com.dailyprotagonist"
    }

    private init() {}

    func getUserId() -> String {
        // First try to get from Keychain
        if let existingId = getFromKeychain() {
            return existingId
        }

        // Generate new ID and store
        let newId = UUID().uuidString
        saveToKeychain(userId: newId)
        return newId
    }

    private func getFromKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Keys.service,
            kSecAttrAccount as String: Keys.userId,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let userId = String(data: data, encoding: .utf8) else {
            return nil
        }

        return userId
    }

    private func saveToKeychain(userId: String) {
        let data = userId.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Keys.service,
            kSecAttrAccount as String: Keys.userId,
            kSecValueData as String: data
        ]

        // Delete existing first
        SecItemDelete(query as CFDictionary)

        // Add new
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("⚠️ Failed to save user ID to Keychain: \(status)")
        }
    }
}
