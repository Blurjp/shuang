import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if authManager.isUserAuthenticated {
                if authManager.isUserOnboarded {
                    MainTabView()
                } else {
                    OnboardingView()
                }
            } else {
                AuthView()
            }
        }
        .task {
            authManager.checkAuthStatus()
        }
    }
}
