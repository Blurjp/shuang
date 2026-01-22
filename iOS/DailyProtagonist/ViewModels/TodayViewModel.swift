import Foundation

@MainActor
class TodayViewModel: ObservableObject {
    @Published var todayContent: DailyContent?
    @Published var isLoading = false
    @Published var isGenerating = false
    @Published var isGeneratingPortrait = false
    @Published var errorMessage: String?
    @Published var hasContentToday = false
    @Published var showDailyLimitAlert = false
    @Published var showUpgradeAlert = false
    @Published var remainingGenerations = 1
    @Published var isPremium = false

    private let apiService = APIService.shared
    weak var authManager: AuthManager?
    weak var subscriptionManager: SubscriptionManager?
    weak var dailyImageViewModel: DailyImageViewModel?

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
                errorMessage = "No content available yet, please check back later"
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

        // Sync premium status with backend before generating
        if let subscriptionManager = subscriptionManager, subscriptionManager.isPremium {
            print("⭐ Syncing premium status to backend...")
            do {
                _ = try await apiService.updateSubscriptionStatus(
                    isPremium: true,
                    expirationDate: nil,
                    token: token
                )
                print("✅ Premium status synced to backend")
                // Small delay to let backend process
                try? await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                print("⚠️ Failed to sync premium status: \(error)")
            }
        }

        do {
            let content = try await apiService.generateContent(token: token)
            print("🟢 Content generated successfully!")
            todayContent = content
            hasContentToday = true
            // Note: remainingGenerations will be updated on next loadTodayContent call
        } catch let error as APIError {
            print("❌ API Error: \(error.localizedDescription)")
            if case .httpError(429) = error {
                // Check if user is premium (local subscription manager)
                if let subscriptionManager = subscriptionManager, subscriptionManager.isPremium {
                    // Premium users - backend still limiting them
                    print("⭐ Premium user hit limit - backend doesn't recognize premium status yet")
                    errorMessage = "Premium feature: The backend needs to be updated to recognize your premium status. In production, you'll have unlimited access."
                } else {
                    // Free users - show upgrade alert
                    showDailyLimitAlert = true
                    showUpgradeAlert = true
                }
            } else if case .httpError(400) = error {
                errorMessage = "Daily content already generated"
            } else {
                errorMessage = error.localizedDescription
            }
        } catch {
            print("❌ Error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }

        isGenerating = false
    }

    /// Combined premium feature: Generate new story AND personalized portrait
    func generateStoryWithPortrait(token: String) async {
        isGenerating = true
        isGeneratingPortrait = true
        errorMessage = nil

        print("🎨 Generating new story with personalized portrait...")

        // Sync premium status with backend before generating
        if let subscriptionManager = subscriptionManager, subscriptionManager.isPremium {
            print("⭐ Syncing premium status to backend...")
            do {
                _ = try await apiService.updateSubscriptionStatus(
                    isPremium: true,
                    expirationDate: nil,
                    token: token
                )
                print("✅ Premium status synced to backend")
                try? await Task.sleep(nanoseconds: 500_000_000)
            } catch {
                print("⚠️ Failed to sync premium status: \(error)")
            }
        }

        do {
            // Step 1: Generate new story content
            print("📝 Step 1: Generating new story...")
            let content = try await apiService.generateContent(token: token)
            print("🟢 Story generated: \(content.text.prefix(50))...")
            todayContent = content
            hasContentToday = true

            // Step 2: Generate personalized portrait with user's face
            print("🎭 Step 2: Generating personalized portrait...")
            if let dailyImageViewModel = dailyImageViewModel {
                // The daily image service will use the user's registered face photo
                await dailyImageViewModel.generateImage(storyText: content.text)
                print("🟢 Portrait generation initiated")
            } else {
                print("⚠️ DailyImageViewModel not available")
            }

            print("✅ Premium content generated successfully!")
        } catch let error as APIError {
            print("❌ API Error: \(error.localizedDescription)")
            if case .httpError(429) = error {
                if let subscriptionManager = subscriptionManager, subscriptionManager.isPremium {
                    errorMessage = "Premium feature: The backend needs to recognize your premium status."
                } else {
                    showDailyLimitAlert = true
                    showUpgradeAlert = true
                }
            } else if case .httpError(400) = error {
                errorMessage = "Daily content already generated"
            } else {
                errorMessage = error.localizedDescription
            }
        } catch {
            print("❌ Error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }

        isGenerating = false
        isGeneratingPortrait = false
    }
}
