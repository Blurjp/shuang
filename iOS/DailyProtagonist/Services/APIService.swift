import Foundation

class APIService {
    static let shared = APIService()

    // Backend URL - can switch between local and production
    // Set to true to use Railway backend even in DEBUG mode
    private let useProduction = false

    private var baseURL: String {
        #if DEBUG
        return useProduction ? "https://backend-production-61f4.up.railway.app/api" : "http://localhost:3000/api"
        #else
        return "https://backend-production-61f4.up.railway.app/api"
        #endif
    }

    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120  // 2 minutes for content generation with DALL-E
        config.timeoutIntervalForResource = 180  // 3 minutes total
        config.httpMaximumConnectionsPerHost = 1
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        self.session = URLSession(configuration: config)
    }

    private func getURL(for endpoint: String) -> URL? {
        URL(string: "\(baseURL)\(endpoint)")
    }

    private func performRequest<T: Decodable>(
        url: URL,
        method: String = "GET",
        body: Data? = nil,
        token: String? = nil,
        responseType: T.Type
    ) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Keep per-request timeout aligned with session configuration.
        request.timeoutInterval = session.configuration.timeoutIntervalForRequest

        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        do {
            let (data, response) = try await self.session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            // Log response for debugging
            print("API Response (\(url.path)): Status \(httpResponse.statusCode)")
            if let responseStr = String(data: data, encoding: .utf8), !responseStr.isEmpty {
                print("Response body: \(responseStr)")
            }

            if httpResponse.statusCode >= 400 {
                // Try to parse error response body
                if let responseStr = String(data: data, encoding: .utf8), !responseStr.isEmpty {
                    // For 404 on /content/today, try to parse NoContentResponse
                    if httpResponse.statusCode == 404 && url.path.contains("/content/today") {
                        if let jsonData = responseStr.data(using: .utf8) {
                            let decoder = JSONDecoder()
                            if let noContentResp = try? decoder.decode(NoContentResponse.self, from: jsonData) {
                                throw APIError.noContent(noContentResp)
                            }
                        }
                    }
                }
                throw APIError.httpError(httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                print("Decoding error: \(error)")
                if let responseStr = String(data: data, encoding: .utf8) {
                    print("Failed to decode: \(responseStr)")
                }
                throw APIError.decodingError
            }
        } catch let error as APIError {
            throw error
        } catch let urlError as URLError {
            print("URL Error: \(urlError.localizedDescription) (code: \(urlError.code.rawValue))")
            throw APIError.networkError(urlError.localizedDescription)
        } catch {
            print("Unexpected error: \(error.localizedDescription)")
            throw APIError.unknownError(error.localizedDescription)
        }
    }
}

// MARK: - Auth APIs
extension APIService {
    func register(email: String? = nil, anonymousId: String? = nil) async throws -> RegisterResponse {
        guard let url = getURL(for: "/auth/register") else {
            print("❌ Failed to create URL for /auth/register")
            throw APIError.invalidURL
        }

        print("✅ Created URL: \(url.absoluteString)")

        let request = RegisterRequest(email: email, anonymousId: anonymousId)
        let body = try JSONEncoder().encode(request)

        return try await performRequest(url: url, method: "POST", body: body, responseType: RegisterResponse.self)
    }

    func login(email: String) async throws -> RegisterResponse {
        guard let url = getURL(for: "/auth/login") else {
            throw APIError.invalidURL
        }

        let request = LoginRequest(email: email)
        let body = try JSONEncoder().encode(request)

        return try await performRequest(url: url, method: "POST", body: body, responseType: RegisterResponse.self)
    }
}

// MARK: - User APIs
extension APIService {
    func completeOnboarding(gender: User.Gender, genrePreference: User.Genre, emotionPreference: User.Emotion, token: String) async throws {
        guard let url = getURL(for: "/user/onboarding") else {
            throw APIError.invalidURL
        }

        let request = OnboardingRequest(gender: gender, genrePreference: genrePreference, emotionPreference: emotionPreference)
        let body = try JSONEncoder().encode(request)

        let _: SuccessResponse = try await performRequest(url: url, method: "POST", body: body, token: token, responseType: SuccessResponse.self)
    }

    func getUserPreferences(token: String) async throws -> UserPreferences {
        guard let url = getURL(for: "/user/preferences") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: UserPreferences.self)
    }

    func updateUserPreferences(gender: User.Gender? = nil, genrePreference: User.Genre? = nil, emotionPreference: User.Emotion? = nil, token: String) async throws {
        guard let url = getURL(for: "/user/preferences") else {
            throw APIError.invalidURL
        }

        let request = UpdatePreferencesRequest(gender: gender, genrePreference: genrePreference, emotionPreference: emotionPreference)
        let body = try JSONEncoder().encode(request)

        let _: SuccessResponse = try await performRequest(url: url, method: "PUT", body: body, token: token, responseType: SuccessResponse.self)
    }

    func registerPushToken(token: String, platform: String = "ios", authToken: String) async throws {
        guard let url = getURL(for: "/user/push-token") else {
            throw APIError.invalidURL
        }

        let request = PushTokenRequest(platform: platform, token: token)
        let body = try JSONEncoder().encode(request)

        let _: SuccessResponse = try await performRequest(url: url, method: "POST", body: body, token: authToken, responseType: SuccessResponse.self)
    }
}

// MARK: - Photo APIs
extension APIService {
    func uploadPhoto(imageData: Data, token: String) async throws -> PhotoUploadResponse {
        guard let url = getURL(for: "/photos/upload") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        // Create multipart form data
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"photo\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        do {
            let (data, response) = try await self.session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            print("Photo upload response status: \(httpResponse.statusCode)")

            if httpResponse.statusCode >= 400 {
                throw APIError.httpError(httpResponse.statusCode)
            }

            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            do {
                return try decoder.decode(PhotoUploadResponse.self, from: data)
            } catch {
                print("Photo upload decoding error: \(error)")
                if let responseStr = String(data: data, encoding: .utf8) {
                    print("Failed to decode: \(responseStr)")
                }
                throw APIError.decodingError
            }
        } catch let error as APIError {
            throw error
        } catch {
            print("Photo upload error: \(error)")
            throw APIError.networkError(error.localizedDescription)
        }
    }

    func getUserPhotos(token: String) async throws -> [UserPhoto] {
        guard let url = getURL(for: "/photos") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: [UserPhoto].self)
    }

    func deletePhoto(photoId: String, token: String) async throws {
        guard let url = getURL(for: "/photos/\(photoId)") else {
            throw APIError.invalidURL
        }

        let _: SuccessResponse = try await performRequest(url: url, method: "DELETE", token: token, responseType: SuccessResponse.self)
    }
}

// MARK: - Content APIs
extension APIService {
    func getTodayContent(token: String) async throws -> DailyContent {
        guard let url = getURL(for: "/content/today") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: DailyContent.self)
    }

    func getContentHistory(days: Int = 7, token: String) async throws -> [ContentPreview] {
        guard let url = getURL(for: "/content/history?days=\(days)") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: [ContentPreview].self)
    }

    func getContent(id: String, token: String) async throws -> DailyContent {
        guard let url = getURL(for: "/content/\(id)") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: DailyContent.self)
    }

    func generateContent(token: String) async throws -> DailyContent {
        guard let url = getURL(for: "/content/generate") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "POST", token: token, responseType: DailyContent.self)
    }
}

// MARK: - Feedback APIs
extension APIService {
    func submitFeedback(contentId: String, rating: FeedbackRating, token: String) async throws {
        guard let url = getURL(for: "/feedback") else {
            throw APIError.invalidURL
        }

        let request = FeedbackRequest(contentId: contentId, rating: rating)
        let body = try JSONEncoder().encode(request)

        let _: SuccessResponse = try await performRequest(url: url, method: "POST", body: body, token: token, responseType: SuccessResponse.self)
    }
}

// MARK: - Subscription APIs
extension APIService {
    func updateSubscriptionStatus(isPremium: Bool, expirationDate: Date? = nil, token: String) async throws -> SuccessResponse {
        guard let url = getURL(for: "/subscription/status") else {
            throw APIError.invalidURL
        }

        let request = SubscriptionStatusRequest(isPremium: isPremium, expirationDate: expirationDate)
        let body = try JSONEncoder().encode(request)

        return try await performRequest(url: url, method: "POST", body: body, token: token, responseType: SuccessResponse.self)
    }

    func getSubscriptionStatus(token: String) async throws -> SubscriptionStatus {
        guard let url = getURL(for: "/subscription/status") else {
            throw APIError.invalidURL
        }

        return try await performRequest(url: url, method: "GET", token: token, responseType: SubscriptionStatus.self)
    }
}

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError
    case networkError(String)
    case unknownError(String)
    case noContent(NoContentResponse)

    var localizedDescription: String {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response"
        case .httpError(let code):
            switch code {
            case 401: return "Unauthorized, please log in again"
            case 403: return "Access denied"
            case 404: return "Resource not found"
            case 429: return "Daily limit reached, upgrade for unlimited access"
            case 500: return "Server error"
            default: return "Network error (\(code))"
            }
        case .decodingError: return "Data parsing failed"
        case .networkError(let msg): return "Network connection failed: \(msg)"
        case .unknownError(let msg): return "Unknown error: \(msg)"
        case .noContent(let resp): return resp.error
        }
    }
}
