import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = HistoryViewModel()
    @State private var selectedContent: DailyContent?
    @State private var showingDetail = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                } else if viewModel.historyItems.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No history yet")
                            .foregroundColor(.secondary)
                    }
                } else {
                    List {
                        ForEach(viewModel.historyItems) { item in
                            Button(action: {
                                Task {
                                    await loadContentDetail(item: item)
                                }
                            }) {
                                HStack(spacing: 12) {
                                    // Thumbnail
                                    RemoteImageView(urlString: item.imageUrl) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Rectangle()
                                            .fill(Color.gray.opacity(0.3))
                                    }
                                    .frame(width: 80, height: 80)
                                    .cornerRadius(8)
                                    .clipped()

                                    // Info
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(item.displayDate)
                                            .font(.headline)
                                        Text(item.textPreview)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                            .lineLimit(2)

                                        if let feedback = item.feedback {
                                            HStack(spacing: 4) {
                                                Text(feedback.icon)
                                                Text(feedback == .like ? "Love" : feedback == .neutral ? "Okay" : "Dislike")
                                                    .font(.caption)
                                            }
                                            .foregroundColor(.secondary)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding(.vertical, 4)
                            }
                            .foregroundColor(.primary)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("History")
            .task {
                // Inject authManager reference
                viewModel.authManager = authManager
                if let token = authManager.getAuthToken() {
                    await viewModel.loadHistory(token: token)
                }
            }
            .refreshable {
                if let token = authManager.getAuthToken() {
                    await viewModel.loadHistory(token: token)
                }
            }
            .sheet(isPresented: $showingDetail) {
                if let content = selectedContent {
                    ContentDetailView(content: content, authManager: authManager)
                }
            }
        }
    }

    private func loadContentDetail(item: ContentPreview) async {
        guard let token = authManager.getAuthToken() else { return }

        do {
            let content = try await viewModel.getContentDetail(id: item.id, token: token)
            selectedContent = content
            showingDetail = true
        } catch {
            print("Failed to load content detail: \(error)")
        }
    }
}

struct ContentDetailView: View {
    let content: DailyContent
    let authManager: AuthManager
    @StateObject private var viewModel = TodayViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Date Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(content.displayDate)
                                .font(.title2)
                                .fontWeight(.bold)
                            Text("Your Story")
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding()

                    Divider()

                    // Image
                    RemoteImageView(urlString: content.imageUrl) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        ProgressView()
                            .frame(maxWidth: CGFloat.infinity)
                            .frame(height: 400)
                            .background(Color.gray.opacity(0.2))
                    } failure: {
                        Image(systemName: "photo")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                            .frame(maxWidth: CGFloat.infinity)
                            .frame(height: 400)
                            .background(Color.gray.opacity(0.2))
                    }
                    .frame(maxWidth: CGFloat.infinity)
                    .frame(height: 400)
                    .clipped()

                    // Content Text
                    VStack(alignment: .leading, spacing: 16) {
                        Text(content.text)
                            .font(.body)
                            .lineSpacing(6)
                            .padding()
                    }

                    Divider()

                    // Feedback Display
                    HStack {
                        if let feedback = content.feedback {
                            HStack(spacing: 8) {
                                Text(feedback.icon)
                                    .font(.title2)
                                Text(feedback == .like ? "You loved this story" : feedback == .neutral ? "You thought this story was okay" : "You didn't like this story")
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                        } else {
                            Text("No feedback")
                                .foregroundColor(.secondary)
                                .padding()
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }
}
