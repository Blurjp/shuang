import Foundation
import PhotosUI

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var userPreferences: UserPreferences?
    @Published var userPhotos: [UserPhoto] = []
    @Published var isLoading = false
    @Published var isUploadingPhoto = false
    @Published var errorMessage: String?
    @Published var showLogoutAlert = false

    private let apiService = APIService.shared
    weak var authManager: AuthManager?

    func loadPreferences(token: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let preferences = try await apiService.getUserPreferences(token: token)
            userPreferences = preferences
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await loadPreferences(token: newToken)
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

    func loadUserPhotos(token: String) async {
        do {
            userPhotos = try await apiService.getUserPhotos(token: token)
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await loadUserPhotos(token: newToken)
                    return
                }
            } else {
                print("Failed to load photos: \(error)")
            }
        } catch {
            print("Failed to load photos: \(error)")
        }
    }

    func uploadPhoto(imageData: Data, token: String) async {
        isUploadingPhoto = true
        errorMessage = nil

        do {
            let response = try await apiService.uploadPhoto(imageData: imageData, token: token)
            print("Photo uploaded successfully: \(response.id)")

            // Reload photos
            await loadUserPhotos(token: token)
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await uploadPhoto(imageData: imageData, token: newToken)
                    return
                }
            } else {
                errorMessage = "Upload failed: \(error.localizedDescription)"
                print("Failed to upload photo: \(error)")
            }
        } catch {
            errorMessage = "Upload failed: \(error.localizedDescription)"
            print("Failed to upload photo: \(error)")
        }

        isUploadingPhoto = false
    }

    func deletePhoto(photoId: String, token: String) async {
        do {
            try await apiService.deletePhoto(photoId: photoId, token: token)
            // Remove from local array
            userPhotos.removeAll { $0.id == photoId }
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await deletePhoto(photoId: photoId, token: newToken)
                    return
                }
            } else {
                errorMessage = "Delete failed: \(error.localizedDescription)"
            }
        } catch {
            errorMessage = "Delete failed: \(error.localizedDescription)"
        }
    }

    func updatePreferences(gender: User.Gender? = nil, genrePreference: User.Genre? = nil, emotionPreference: User.Emotion? = nil, token: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await apiService.updateUserPreferences(
                gender: gender,
                genrePreference: genrePreference,
                emotionPreference: emotionPreference,
                token: token
            )

            // Reload preferences
            let preferences = try await apiService.getUserPreferences(token: token)
            userPreferences = preferences
        } catch let error as APIError {
            if case .httpError(403) = error {
                await handleExpiredToken()
                if let newToken = authManager?.getAuthToken() {
                    await updatePreferences(gender: gender, genrePreference: genrePreference, emotionPreference: emotionPreference, token: newToken)
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
