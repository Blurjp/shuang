import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: selectedTab == 0 ? "calendar.badge.checkmark" : "calendar")
                }
                .tag(0)

            HistoryView()
                .tabItem {
                    Label("History", systemImage: selectedTab == 1 ? "clock.fill" : "clock")
                }
                .tag(1)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: selectedTab == 2 ? "person.fill" : "person")
                }
                .tag(2)
        }
        .accentColor(.blue)
    }
}
