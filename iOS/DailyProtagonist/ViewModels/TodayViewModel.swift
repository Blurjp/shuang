import Foundation

@MainActor
class TodayViewModel: ObservableObject {
    @Published var todayContent: DailyContent?
    @Published var isLoading = false
    @Published var isGenerating = false
    @Published var errorMessage: String?
    @Published var hasContentToday = false
    @Published var showDailyLimitAlert = false
    @Published var showUpgradeAlert = false
    @Published var remainingGenerations = 1
    @Published var isPremium = false

    private let apiService = APIService.shared
    weak var authManager: AuthManager?

    func loadTodayContent(token: String) async {
        isLoading = true
        errorMessage = nil

        print("🟢 Loading today's content with token: \(token.prefix(20))...")

        do {
            let content = try await apiService.getTodayContent(token: token)
            print("🟢 Content loaded successfully!")
            print("🟢 Content ID: \(content.id)")
            print("🟢 Content text: \(content.text.prefix(50))...")
            todayContent = content
            hasContentToday = true
        } catch let error as APIError {
            print("❌ API Error: \(error.localizedDescription)")
            // Handle 403 - try to re-authenticate
            if case .httpError(403) = error {
                print("🔄 Token expired, attempting re-authentication...")
                await handleExpiredToken()
                // Retry with new token
                if let newToken = authManager?.getAuthToken() {
                    await loadTodayContent(token: newToken)
                    return
                }
            } else if case .httpError(404) = error {
                hasContentToday = false
                errorMessage = "今日内容尚未送达，请稍后再来"
            } else if case .noContent(let resp) = error {
                hasContentToday = false
                remainingGenerations = resp.remainingGenerations
                isPremium = resp.isPremium
                print("📊 Remaining generations: \(resp.remainingGenerations), Premium: \(resp.isPremium)")
            } else {
                errorMessage = error.localizedDescription
            }
        } catch {
            print("❌ Error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func handleExpiredToken() async {
        guard let authManager = authManager else { return }
        do {
            try await authManager.reAuthenticate()
            print("✅ Re-authentication successful")
        } catch {
            print("❌ Re-authentication failed: \(error.localizedDescription)")
            authManager.logout()
        }
    }

    func submitFeedback(rating: FeedbackRating, token: String) async {
        guard let content = todayContent else { return }

        do {
            try await apiService.submitFeedback(contentId: content.id, rating: rating, token: token)
            todayContent?.feedback = rating
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refresh(token: String) async {
        await loadTodayContent(token: token)
    }

    func generateContent(token: String) async {
        isGenerating = true
        errorMessage = nil

        print("🟢 Generating new content...")

        do {
            let content = try await apiService.generateContent(token: token)
            print("🟢 Content generated successfully!")
            todayContent = content
            hasContentToday = true
            // Note: remainingGenerations will be updated on next loadTodayContent call
        } catch let error as APIError {
            print("❌ API Error: \(error.localizedDescription)")
            if case .httpError(429) = error {
                showDailyLimitAlert = true
                showUpgradeAlert = true
            } else if case .httpError(400) = error {
                errorMessage = "今日内容已生成"
            } else {
                errorMessage = error.localizedDescription
            }
        } catch {
            print("❌ Error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }

        isGenerating = false
    }
}
