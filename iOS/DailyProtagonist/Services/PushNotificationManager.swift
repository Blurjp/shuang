import Foundation
import UserNotifications

@MainActor
class PushNotificationManager: ObservableObject {
    @Published var isAuthorized = false

    private let userDefaults = UserDefaults.standard
    private enum Keys {
        static let deviceToken = "deviceToken"
        static let tokenRegistered = "tokenRegistered"
    }

    func requestAuthorization() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                self.isAuthorized = granted
                if let error = error {
                    print("Push notification authorization error: \(error)")
                }
            }
        }

        center.getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    func registerForRemoteNotifications(deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()

        print("Device Token: \(token)")

        // Store token locally for retry later
        userDefaults.set(token, forKey: Keys.deviceToken)
        userDefaults.set(false, forKey: Keys.tokenRegistered)

        // Send token to backend
        Task {
            await sendTokenToBackend(token: token)
        }
    }

    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    func didReceiveRemoteNotification(userInfo: [AnyHashable: Any]) {
        // Handle remote notification
        print("Received remote notification: \(userInfo)")
    }

    // Call this when user authentication changes (login/register)
    func retryTokenRegistrationIfNeeded(authToken: String?) async {
        guard authToken != nil,
              let deviceToken = userDefaults.string(forKey: Keys.deviceToken),
              !userDefaults.bool(forKey: Keys.tokenRegistered) else {
            return
        }

        await sendTokenToBackend(token: deviceToken)
    }

    private func sendTokenToBackend(token: String) async {
        guard let authToken = getAuthToken() else {
            print("No auth token available, skipping push token registration")
            return
        }

        do {
            try await APIService.shared.registerPushToken(token: token, authToken: authToken)
            print("Push token registered successfully")
            userDefaults.set(true, forKey: Keys.tokenRegistered)
        } catch {
            print("Failed to register push token: \(error)")
        }
    }

    private func getAuthToken() -> String? {
        userDefaults.string(forKey: "authToken")
    }
}
