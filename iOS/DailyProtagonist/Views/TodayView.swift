import SwiftUI
import PhotosUI

struct TodayView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    @StateObject private var viewModel = TodayViewModel()
    @StateObject private var dailyImageViewModel = DailyImageViewModel()

    // Combined premium status from both backend and local subscription manager
    private var isPremium: Bool {
        viewModel.isPremium || subscriptionManager.isPremium
    }

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
                        .padding(.horizontal, 16)

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
                                .aspectRatio(contentMode: .fit)
                        } placeholder: {
                            ProgressView()
                                .frame(maxWidth: CGFloat.infinity)
                                .frame(height: 250)
                                .background(Color.gray.opacity(0.2))
                        } failure: {
                            Image(systemName: "photo")
                                .font(.system(size: 60))
                                .foregroundColor(.gray)
                                .frame(maxWidth: CGFloat.infinity)
                                .frame(height: 250)
                                .background(Color.gray.opacity(0.2))
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 250)
                        .clipped()

                        // Content Text
                        VStack(alignment: .leading, spacing: 12) {
                            Text(content.text)
                                .font(.body)
                                .lineSpacing(6)
                        }
                        .padding()
                        .padding(.horizontal, 4)

                        Divider()

                        // Feedback Buttons
                        HStack(spacing: 12) {
                            ForEach([FeedbackRating.like, .neutral, .dislike], id: \.self) { rating in
                                Button(action: {
                                    Task {
                                        await viewModel.submitFeedback(rating: rating, token: authManager.getAuthToken() ?? "")
                                    }
                                }) {
                                    VStack(spacing: 4) {
                                        Text(rating.icon)
                                            .font(.title2)
                                        Text(rating == .like ? "Love" : rating == .neutral ? "Okay" : "Dislike")
                                            .font(.caption2)
                                    }
                                    .frame(maxWidth: CGFloat.infinity)
                                    .padding(.vertical, 12)
                                    .background(content.feedback == rating ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1))
                                    .cornerRadius(10)
                                }
                                .foregroundColor(.primary)
                            }
                        }
                        .padding(.horizontal)

                        // Premium: Generate More Section
                        if isPremium {
                            premiumGenerateMoreSection
                        }
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

                        // Premium: Quick Actions Section
                        if isPremium {
                            premiumQuickActionsSection
                        }

                        // Upgrade button for free users
                        if !isPremium {
                            upgradeButtonView
                        }
                    }
                    .frame(maxWidth: CGFloat.infinity, minHeight: 300)
                }
            }
            .navigationTitle("Today")
            .task {
                // Inject manager references
                viewModel.authManager = authManager
                viewModel.subscriptionManager = subscriptionManager
                viewModel.dailyImageViewModel = dailyImageViewModel
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
        if isPremium {
            return "Unlimited"
        } else {
            return "\(viewModel.remainingGenerations) left today"
        }
    }

    private var generateButtonSubtext: String {
        if isPremium {
            return "Premium - Generate unlimited content"
        } else {
            return "Free users: 1 generation per day. Upgrade for unlimited."
        }
    }

    private var upgradeButtonView: some View {
        Button(action: {
            viewModel.showUpgradeAlert = true
        }) {
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundColor(.yellow)
                Text("Upgrade to Premium")
                    .fontWeight(.semibold)
                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.yellow, Color.orange]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }

    @ViewBuilder
    private var premiumQuickActionsSection: some View {
        VStack(spacing: 16) {
            Divider()

            // Premium badge
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundColor(.yellow)
                Text("Premium - Unlimited Content")
                    .font(.headline)
                Spacer()
            }
            .padding(.horizontal)

            // Combined: Generate story + portrait button
            Button(action: {
                Task {
                    if let token = authManager.getAuthToken() {
                        await viewModel.generateStoryWithPortrait(token: token)
                    }
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Generate Story & Portrait")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        Text("New story with personalized AI portrait using your face")
                            .font(.caption2)
                    }

                    Spacer()

                    if viewModel.isGenerating || viewModel.isGeneratingPortrait {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.caption)
                    }
                }
                .foregroundColor(.primary)
                .padding()
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.purple.opacity(0.15), Color.blue.opacity(0.15)]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }
            .disabled(viewModel.isGenerating || viewModel.isGeneratingPortrait)
        }
        .padding(.top, 8)
    }

    @ViewBuilder
    private var premiumGenerateMoreSection: some View {
        Divider()

        VStack(spacing: 16) {
            // Premium badge
            HStack {
                Image(systemName: "crown.fill")
                    .foregroundColor(.yellow)
                Text("Premium - Unlimited Content")
                    .font(.headline)
                Spacer()
            }
            .padding(.horizontal)

            // Combined: Generate new story AND personalized portrait
            Button(action: {
                Task {
                    if let token = authManager.getAuthToken() {
                        await viewModel.generateStoryWithPortrait(token: token)
                    }
                }
            }) {
                HStack(spacing: 16) {
                    // Left: Story icon
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(LinearGradient(
                                    gradient: Gradient(colors: [Color.blue.opacity(0.2), Color.purple.opacity(0.2)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                                .frame(width: 60, height: 60)

                            Image(systemName: "sparkles")
                                .font(.title2)
                                .foregroundStyle(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.blue, Color.purple]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        }

                        Text("Story")
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }

                    // Center: Plus icon
                    Image(systemName: "plus")
                        .font(.title3)
                        .foregroundColor(.secondary)

                    // Right: Portrait icon
                    VStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(LinearGradient(
                                    gradient: Gradient(colors: [Color.orange.opacity(0.2), Color.pink.opacity(0.2)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                                .frame(width: 60, height: 60)

                            Image(systemName: "person.fill.viewfinder")
                                .font(.title2)
                                .foregroundStyle(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.orange, Color.pink]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                        }

                        Text("Portrait")
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }

                    Spacer()

                    // Right side: Description and arrow
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Generate New Story & Portrait")
                            .font(.subheadline)
                            .fontWeight(.semibold)

                        HStack(spacing: 4) {
                            if viewModel.isGenerating || viewModel.isGeneratingPortrait {
                                ProgressView()
                                    .scaleEffect(0.7)

                                if viewModel.isGenerating {
                                    Text("Generating story...")
                                        .font(.caption)
                                } else if viewModel.isGeneratingPortrait {
                                    Text("Creating portrait...")
                                        .font(.caption)
                                }
                            } else {
                                Text("New story with your face")
                                    .font(.caption)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                    }
                }
                .foregroundColor(.primary)
                .padding()
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.blue.opacity(0.08),
                            Color.purple.opacity(0.08),
                            Color.orange.opacity(0.08)
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.blue.opacity(0.3),
                                    Color.purple.opacity(0.3),
                                    Color.orange.opacity(0.3)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            lineWidth: 1.5
                        )
                )
            }
            .disabled(viewModel.isGenerating || viewModel.isGeneratingPortrait)

            Text("✨ Unlimited generations • Story + Personalized Portrait with your face")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)
        }
        .padding(.vertical, 16)
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
