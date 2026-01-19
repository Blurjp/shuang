import Foundation
import UIKit

@MainActor
class AuthManager: ObservableObject {
    @Published var isUserAuthenticated: Bool = false
    @Published var isUserOnboarded: Bool = false
    @Published var currentUser: User?
    @Published var isAuthenticating = false

    private let apiService = APIService.shared
    private let userDefaults = UserDefaults.standard

    private enum Keys {
        static let userId = "userId"
        static let authToken = "authToken"
        static let isOnboarded = "isOnboarded"
        static let email = "email"
    }

    init() {
        checkAuthStatus()
    }

    func checkAuthStatus() {
        let token = userDefaults.string(forKey: Keys.authToken)
        isUserAuthenticated = token != nil
        isUserOnboarded = userDefaults.bool(forKey: Keys.isOnboarded)
        currentUser = buildCurrentUser()
    }

    // Re-authenticate with stored email (used when token is invalid/expired)
    func reAuthenticate() async throws {
        guard let email = userDefaults.string(forKey: Keys.email) else {
            // No email stored, need to login again
            logout()
            throw AuthError.notAuthenticated
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        // Use register which handles both existing and new users
        let response = try await apiService.register(email: email)

        userDefaults.set(response.userId, forKey: Keys.userId)
        userDefaults.set(response.token, forKey: Keys.authToken)
        userDefaults.set(email, forKey: Keys.email)

        isUserAuthenticated = true
        checkAuthStatus()
    }

    func getAuthToken() -> String? {
        userDefaults.string(forKey: Keys.authToken)
    }

    func register(email: String? = nil, anonymousId: String? = nil) async throws {
        let response = try await apiService.register(email: email, anonymousId: anonymousId)

        userDefaults.set(response.userId, forKey: Keys.userId)
        userDefaults.set(response.token, forKey: Keys.authToken)

        if let email = email {
            userDefaults.set(email, forKey: "email")
        }

        isUserAuthenticated = true
        checkAuthStatus()
    }

    func login(email: String) async throws {
        let response = try await apiService.login(email: email)

        userDefaults.set(response.userId, forKey: Keys.userId)
        userDefaults.set(response.token, forKey: Keys.authToken)
        userDefaults.set(email, forKey: "email")

        isUserAuthenticated = true
        checkAuthStatus()
    }

    func completeOnboarding(gender: User.Gender, genrePreference: User.Genre, emotionPreference: User.Emotion) async throws {
        guard let token = getAuthToken() else {
            throw AuthError.notAuthenticated
        }

        try await apiService.completeOnboarding(
            gender: gender,
            genrePreference: genrePreference,
            emotionPreference: emotionPreference,
            token: token
        )

        userDefaults.set(gender.rawValue, forKey: "gender")
        userDefaults.set(genrePreference.rawValue, forKey: "genrePreference")
        userDefaults.set(emotionPreference.rawValue, forKey: "emotionPreference")
        userDefaults.set(true, forKey: Keys.isOnboarded)

        isUserOnboarded = true
        checkAuthStatus()
    }

    func logout() {
        userDefaults.removeObject(forKey: Keys.userId)
        userDefaults.removeObject(forKey: Keys.authToken)
        userDefaults.removeObject(forKey: Keys.isOnboarded)
        userDefaults.removeObject(forKey: Keys.email)
        userDefaults.removeObject(forKey: "gender")
        userDefaults.removeObject(forKey: "genrePreference")
        userDefaults.removeObject(forKey: "emotionPreference")

        isUserAuthenticated = false
        isUserOnboarded = false
        currentUser = nil
    }

    func updatePreferences(gender: User.Gender? = nil, genrePreference: User.Genre? = nil, emotionPreference: User.Emotion? = nil) async throws {
        guard let token = getAuthToken() else {
            throw AuthError.notAuthenticated
        }

        try await apiService.updateUserPreferences(
            gender: gender,
            genrePreference: genrePreference,
            emotionPreference: emotionPreference,
            token: token
        )

        if let gender = gender {
            userDefaults.set(gender.rawValue, forKey: "gender")
        }
        if let genrePreference = genrePreference {
            userDefaults.set(genrePreference.rawValue, forKey: "genrePreference")
        }
        if let emotionPreference = emotionPreference {
            userDefaults.set(emotionPreference.rawValue, forKey: "emotionPreference")
        }

        checkAuthStatus()
    }

    private func buildCurrentUser() -> User? {
        guard let userId = userDefaults.string(forKey: Keys.userId) else {
            return nil
        }

        let gender = User.Gender(rawValue: userDefaults.string(forKey: "gender") ?? "")
        let genre = User.Genre(rawValue: userDefaults.string(forKey: "genrePreference") ?? "")
        let emotion = User.Emotion(rawValue: userDefaults.string(forKey: "emotionPreference") ?? "")

        return User(
            id: userId,
            email: userDefaults.string(forKey: "email"),
            gender: gender,
            genrePreference: genre,
            emotionPreference: emotion,
            pushTokenIos: nil,
            isOnboarded: userDefaults.bool(forKey: Keys.isOnboarded),
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}

enum AuthError: Error {
    case notAuthenticated
    case registrationFailed
    case loginFailed
}
