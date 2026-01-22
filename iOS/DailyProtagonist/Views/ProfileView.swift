import SwiftUI
import PhotosUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var subscriptionManager: SubscriptionManager
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showingUpgrade = false
    @State private var showingLogoutAlert = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showingPhotoAlert = false
    @State private var photoAlertMessage = ""
    @State private var showingDeleteAlert = false
    @State private var photoToDelete: UserPhoto?

    // Inline preference state
    @State private var selectedGender: User.Gender?
    @State private var selectedGenre: User.Genre?
    @State private var selectedEmotion: User.Emotion?
    @State private var isUpdatingPreferences = false

    private var isUploadingPhoto: Bool {
        viewModel.isUploadingPhoto
    }

    var body: some View {
        NavigationStack {
            List {
                // User Info Section
                Section {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("User")
                                .font(.headline)
                            Text("ID: \(authManager.currentUser?.id.prefix(8) ?? "")...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // My Photos Section
                Section("My Photos") {
                    if viewModel.userPhotos.isEmpty && !isUploadingPhoto {
                        // Empty state - show upload prompt
                        PhotosPicker(
                            selection: $selectedPhotoItem,
                            matching: .images
                        ) {
                            VStack(spacing: 12) {
                                Image(systemName: "photo.on.rectangle.angled")
                                    .font(.system(size: 40))
                                    .foregroundColor(.gray)
                                Text("Tap to Upload Photo")
                                    .foregroundColor(.blue)
                                Text("No photos uploaded yet")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: CGFloat.infinity)
                            .padding(.vertical, 20)
                        }
                    } else {
                        // Photos Grid with existing photos
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            ForEach(viewModel.userPhotos) { photo in
                                ZStack(alignment: .topTrailing) {
                                    RemoteImageView(urlString: photo.photoUrl) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        ProgressView()
                                    }
                                    .frame(width: 80, height: 80)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                                    )

                                    // Delete button
                                    Button(action: {
                                        photoToDelete = photo
                                        showingDeleteAlert = true
                                    }) {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 24))
                                            .foregroundColor(.white)
                                            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                    .offset(x: 4, y: -4)
                                }
                            }

                            // Upload button
                            PhotosPicker(
                                selection: $selectedPhotoItem,
                                matching: .images
                            ) {
                                ZStack {
                                    Circle()
                                        .fill(Color.gray.opacity(0.1))
                                        .frame(width: 80, height: 80)

                                    if isUploadingPhoto {
                                        ProgressView()
                                    } else {
                                        Image(systemName: "plus")
                                            .font(.title)
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                            .disabled(isUploadingPhoto)
                        }
                        .padding(.vertical, 8)
                    }
                }

                // Preferences Section
                Section("My Preferences") {
                    if viewModel.isLoading {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading...")
                                .foregroundColor(.secondary)
                        }
                    } else if let gender = selectedGender, let genre = selectedGenre, let emotion = selectedEmotion {
                        // Gender Picker
                        Picker("Gender", selection: $selectedGender) {
                            ForEach(User.Gender.allCases, id: \.self) { genderOption in
                                Text(genderOption.displayName).tag(genderOption as User.Gender?)
                            }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: selectedGender) { _, newGender in
                            Task {
                                await updatePreferences()
                            }
                        }

                        // Genre Picker
                        Picker("Genre", selection: $selectedGenre) {
                            ForEach(User.Genre.allCases, id: \.self) { genreOption in
                                Text(genreOption.displayName).tag(genreOption as User.Genre?)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedGenre) { _, newGenre in
                            Task {
                                await updatePreferences()
                            }
                        }

                        // Mood/Emotion Picker
                        Picker("Mood", selection: $selectedEmotion) {
                            ForEach(User.Emotion.allCases, id: \.self) { emotionOption in
                                Text(emotionOption.displayName).tag(emotionOption as User.Emotion?)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedEmotion) { _, newEmotion in
                            Task {
                                await updatePreferences()
                            }
                        }

                        if isUpdatingPreferences {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.7)
                                Text("Updating...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                // Membership Section
                Section("Membership") {
                    HStack {
                        Image(systemName: subscriptionManager.isPremium ? "crown.fill" : "person.circle")
                            .foregroundColor(subscriptionManager.isPremium ? .yellow : .gray)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(subscriptionManager.isPremium ? "Premium Member" : "Free User")
                                .font(.headline)

                            if subscriptionManager.isPremium {
                                Text("All features unlocked")
                                    .font(.caption)
                                    .foregroundColor(.green)
                            } else {
                                Text("Upgrade for unlimited stories")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        if !subscriptionManager.isPremium {
                            Button("Upgrade") {
                                showingUpgrade = true
                            }
                            .buttonStyle(.bordered)
                        } else {
                            Button("Manage") {
                                subscriptionManager.manageSubscription()
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }

                // Actions Section
                Section("Settings") {
                    Button(action: {
                        // TODO: Implement about page
                    }) {
                        HStack {
                            Image(systemName: "info.circle")
                            Text("About")
                        }
                    }
                    .foregroundColor(.primary)
                }

                Section {
                    Button(action: {
                        showingLogoutAlert = true
                    }) {
                        HStack {
                            Image(systemName: "arrow.right.square")
                            Text("Log Out")
                        }
                        .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Profile")
            .onChange(of: selectedPhotoItem) { _, newItem in
                Task {
                    await handlePhotoSelection(newItem)
                }
            }
            .task {
                // Inject authManager reference
                viewModel.authManager = authManager
                if let token = authManager.getAuthToken() {
                    await viewModel.loadPreferences(token: token)
                    await viewModel.loadUserPhotos(token: token)

                    // Load current preferences into state
                    if let preferences = viewModel.userPreferences {
                        selectedGender = preferences.gender
                        selectedGenre = preferences.genrePreference
                        selectedEmotion = preferences.emotionPreference
                    }
                }
            }
            .alert("Alert", isPresented: $showingPhotoAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(photoAlertMessage)
            }
            .alert("Log Out", isPresented: $showingLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Log Out", role: .destructive) {
                    authManager.logout()
                }
            } message: {
                Text("Are you sure you want to log out?")
            }
            .alert("Delete Photo", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    if let photo = photoToDelete, let token = authManager.getAuthToken() {
                        Task {
                            await viewModel.deletePhoto(photoId: photo.id, token: token)
                            if let error = viewModel.errorMessage {
                                photoAlertMessage = error
                                showingPhotoAlert = true
                            }
                        }
                    }
                    photoToDelete = nil
                }
            } message: {
                Text("Are you sure you want to delete this photo?")
            }
            .sheet(isPresented: $showingUpgrade) {
                UpgradeView(isPresented: $showingUpgrade)
            }
        }
    }

    private func handlePhotoSelection(_ item: PhotosPickerItem?) async {
        guard let item = item else { return }

        // Prevent duplicate uploads
        guard !isUploadingPhoto else {
            print("⚠️  Upload already in progress, ignoring duplicate selection")
            selectedPhotoItem = nil
            return
        }

        do {
            if let data = try await item.loadTransferable(type: Data.self) {
                if let token = authManager.getAuthToken() {
                    await viewModel.uploadPhoto(imageData: data, token: token)

                    if let error = viewModel.errorMessage {
                        photoAlertMessage = error
                        showingPhotoAlert = true
                    }
                }
            }
        } catch {
            photoAlertMessage = "Failed to select photo: \(error.localizedDescription)"
            showingPhotoAlert = true
        }

        selectedPhotoItem = nil
    }

    private func updatePreferences() async {
        guard let gender = selectedGender,
              let genre = selectedGenre,
              let emotion = selectedEmotion,
              let token = authManager.getAuthToken() else {
            return
        }

        isUpdatingPreferences = true
        await viewModel.updatePreferences(
            gender: gender,
            genrePreference: genre,
            emotionPreference: emotion,
            token: token
        )
        isUpdatingPreferences = false
    }
}
