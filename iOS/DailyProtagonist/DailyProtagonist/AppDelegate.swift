import UIKit
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Configure push notification delegate
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // This will be called from the App struct via environment object
        NotificationCenter.default.post(name: .didRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .didFailToRegisterForRemoteNotifications, object: error)
    }

    // Handle notification when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        NotificationCenter.default.post(name: .didReceiveRemoteNotification, object: userInfo)
        completionHandler()
    }
}

extension Notification.Name {
    static let didRegisterForRemoteNotifications = Notification.Name("didRegisterForRemoteNotifications")
    static let didFailToRegisterForRemoteNotifications = Notification.Name("didFailToRegisterForRemoteNotifications")
    static let didReceiveRemoteNotification = Notification.Name("didReceiveRemoteNotification")
}
