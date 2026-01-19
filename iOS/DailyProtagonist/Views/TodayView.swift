import SwiftUI
import PhotosUI

struct TodayView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = TodayViewModel()
    @StateObject private var dailyImageViewModel = DailyImageViewModel()

    init() {
        // Inject authManager into viewModel after it's created
        // We'll do this in onAppear/task
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading {
                    VStack(spacing: 20) {
                        ProgressView()
                        Text("Loading...")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: CGFloat.infinity, minHeight: 300)
                } else if let content = viewModel.todayContent {
                    VStack(alignment: .leading, spacing: 0) {
                        // Date Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(content.displayDate)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("Your Story Today")
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding()

                        Divider()

                        // Daily AI Generated Image Section - Only show if user has generated a custom image
                        if case .success = dailyImageViewModel.state {
                            dailyAIImageSection
                            Divider()
                        }

                        // Original Story Image
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

                        // Feedback Buttons
                        HStack(spacing: 16) {
                            ForEach([FeedbackRating.like, .neutral, .dislike], id: \.self) { rating in
                                Button(action: {
                                    Task {
                                        await viewModel.submitFeedback(rating: rating, token: authManager.getAuthToken() ?? "")
                                    }
                                }) {
                                    VStack(spacing: 4) {
                                        Text(rating.icon)
                                            .font(.title)
                                        Text(rating == .like ? "Love" : rating == .neutral ? "Okay" : "Dislike")
                                            .font(.caption)
                                    }
                                    .frame(maxWidth: CGFloat.infinity)
                                    .padding()
                                    .background(content.feedback == rating ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                                    .cornerRadius(12)
                                }
                                .foregroundColor(.primary)
                            }
                        }
                        .padding()
                    }
                } else if let error = viewModel.errorMessage {
                    VStack(spacing: 20) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 60))
                            .foregroundColor(.orange)
                        Text("Failed to Load")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text(error)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        Button("Retry") {
                            Task {
                                if let token = authManager.getAuthToken() {
                                    await viewModel.refresh(token: token)
                                }
                            }
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .frame(maxWidth: CGFloat.infinity, minHeight: 300)
                } else if !viewModel.hasContentToday {
                    VStack(spacing: 24) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 60))
                            .foregroundColor(.blue.opacity(0.6))
                        Text("Generate Your Story")
                            .font(.title2)
                            .fontWeight(.semibold)
                        Text("Tap the button below to generate your personalized story")
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)

                        VStack(spacing: 12) {
                            Button(action: {
                                Task {
                                    if let token = authManager.getAuthToken() {
                                        await viewModel.generateContent(token: token)
                                    }
                                }
                            }) {
                                HStack {
                                    if viewModel.isGenerating {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                        Text("Generating...")
                                            .fontWeight(.medium)
                                    } else {
                                        Image(systemName: "wand.and.stars")
                                            .font(.title3)
                                        Text("Generate Now (\(generateButtonText))")
                                            .fontWeight(.medium)
                                    }
                                }
                                .frame(maxWidth: CGFloat.infinity)
                                .padding()
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.blue, Color.purple]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .foregroundColor(.white)
                                .cornerRadius(12)
                            }
                            .disabled(viewModel.isGenerating)

                            Text(generateButtonSubtext)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.horizontal, 32)

                        Button("Refresh") {
                            Task {
                                if let token = authManager.getAuthToken() {
                                    await viewModel.refresh(token: token)
                                }
                            }
                        }
                        .font(.subheadline)
                        .foregroundColor(.blue)
                    }
                    .frame(maxWidth: CGFloat.infinity, minHeight: 300)
                }
            }
            .navigationTitle("Today")
            .task {
                // Inject authManager reference
                viewModel.authManager = authManager
                print("🔵 TodayView task started")
                if let token = authManager.getAuthToken() {
                    print("🔵 Token found: \(token.prefix(20))...")
                    await viewModel.loadTodayContent(token: token)
                    // Load cached daily image if available
                    dailyImageViewModel.loadCachedImageIfNeeded()
                } else {
                    print("❌ No token found!")
                }
            }
            .refreshable {
                if let token = authManager.getAuthToken() {
                    await viewModel.refresh(token: token)
                }
            }
            .alert("Daily Limit Reached", isPresented: $viewModel.showDailyLimitAlert) {
                Button("OK", role: .cancel) { }
                Button("Upgrade to Premium", action: {
                    viewModel.showUpgradeAlert = true
                })
            } message: {
                Text("Free users can generate 1 story per day. Upgrade for unlimited access!")
            }
            .sheet(isPresented: $viewModel.showUpgradeAlert) {
                UpgradeView(isPresented: $viewModel.showUpgradeAlert)
            }
            .dailyImageFullScreenSheet(
                isPresented: $dailyImageViewModel.showingFullScreenImage,
                image: dailyImageViewModel.fullScreenImage
            )
        }
    }

    // MARK: - Daily AI Image Section

    // Helper to break up complex expression
    private var generateButtonText: String {
        if viewModel.isPremium {
            return "Unlimited"
        } else {
            return "\(viewModel.remainingGenerations) left today"
        }
    }

    private var generateButtonSubtext: String {
        if viewModel.isPremium {
            return "Premium - Generate unlimited content"
        } else {
            return "Free users: 1 generation per day. Upgrade for unlimited."
        }
    }

    @ViewBuilder
    private var dailyAIImageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Your Daily Portrait")
                        .font(.headline)
                    Text("AI-generated personalized illustration")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
            }
            .padding(.horizontal)

            // State-based content
            switch dailyImageViewModel.state {
            case .idle:
                generateImageButton

            case .needsFace:
                uploadFacePhotoButton

            case .loading:
                loadingView

            case .success(let image):
                generatedImageDisplay(image)

            case .error(let message):
                errorView(message)
            }
        }
        .padding(.vertical, 8)
    }

    private var generateImageButton: some View {
        Button(action: {
            if let storyText = viewModel.todayContent?.text {
                Task {
                    await dailyImageViewModel.generateImage(storyText: storyText)
                }
            }
        }) {
            HStack {
                Image(systemName: "wand.and.stars")
                    .font(.title3)
                Text("Generate Your Portrait")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: CGFloat.infinity)
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.blue, Color.purple]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .padding(.horizontal)
    }

    private var uploadFacePhotoButton: some View {
        VStack(spacing: 12) {
            Text("First time? Upload a face photo")
                .font(.subheadline)
                .foregroundColor(.secondary)

            PhotosPicker(
                selection: $dailyImageViewModel.selectedPhotoItem,
                matching: .images
            ) {
                HStack {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.title3)
                    Text("Upload Face Photo")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: CGFloat.infinity)
                .padding()
                .background(Color.blue.opacity(0.1))
                .foregroundColor(.blue)
                .cornerRadius(12)
            }
            .onChange(of: dailyImageViewModel.selectedPhotoItem) { _, newItem in
                guard let newItem = newItem else { return }
                Task {
                    await dailyImageViewModel.handlePhotoSelection(newItem)
                }
            }

            Text("Your photo will only be used to generate personalized images")
                .font(.caption2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal)
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            Text("AI is generating your portrait...")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text("This may take 10-30 seconds")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: CGFloat.infinity)
        .padding(.vertical, 24)
    }

    private func generatedImageDisplay(_ image: UIImage) -> some View {
        VStack(spacing: 12) {
            Button(action: {
                dailyImageViewModel.showFullScreen()
            }) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(maxWidth: CGFloat.infinity)
                    .cornerRadius(12)
                    .shadow(radius: 4)
            }
            .buttonStyle(PlainButtonStyle())

            Text("Tap image to view full screen")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title)
                .foregroundColor(.orange)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.red)

            Button("Regenerate") {
                if let storyText = viewModel.todayContent?.text {
                    Task {
                        await dailyImageViewModel.generateImage(storyText: storyText)
                    }
                }
            }
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)
        }
        .padding()
    }
}

// MARK: - Full Sheet Modifier

extension View {
    func dailyImageFullScreenSheet(
        isPresented: Binding<Bool>,
        image: UIImage?
    ) -> some View {
        self.sheet(isPresented: isPresented) {
            if let image = image {
                FullScreenImageView(image: image, isPresented: isPresented)
            }
        }
    }
}
