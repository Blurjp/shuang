import SwiftUI

@main
struct DailyProtagonistApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authManager = AuthManager()
    @StateObject private var pushNotificationManager = PushNotificationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(pushNotificationManager)
                .onAppear {
                    setupPushNotifications()
                }
                .onReceive(NotificationCenter.default.publisher(for: .didRegisterForRemoteNotifications)) { notification in
                    if let deviceToken = notification.object as? Data {
                        pushNotificationManager.registerForRemoteNotifications(deviceToken: deviceToken)
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: .didFailToRegisterForRemoteNotifications)) { notification in
                    if let error = notification.object as? Error {
                        pushNotificationManager.didFailToRegisterForRemoteNotifications(error: error)
                    }
                }
                .onChange(of: authManager.isUserAuthenticated) { _, isAuthenticated in
                    // Retry push token registration when user becomes authenticated
                    if isAuthenticated {
                        Task {
                            await pushNotificationManager.retryTokenRegistrationIfNeeded(authToken: authManager.getAuthToken())
                        }
                    }
                }
        }
    }

    private func setupPushNotifications() {
        pushNotificationManager.requestAuthorization()

        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
