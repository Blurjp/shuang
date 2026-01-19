import Foundation

@MainActor
class HistoryViewModel: ObservableObject {
    @Published var historyItems: [ContentPreview] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiService = APIService.shared
    weak var authManager: AuthManager?

    func loadHistory(days: Int = 7, token: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let items = try await apiService.getContentHistory(days: days, token: token)
            historyItems = items
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await loadHistory(days: days, token: newToken)
                    return
                }
            } else {
                errorMessage = error.localizedDescription
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func getContentDetail(id: String, token: String) async throws -> DailyContent {
        return try await apiService.getContent(id: id, token: token)
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
}
