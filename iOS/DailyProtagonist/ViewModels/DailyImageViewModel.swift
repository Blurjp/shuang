import Foundation
import UIKit
import SwiftUI
import PhotosUI

/// State machine for daily image generation
enum DailyImageState {
    case idle                      // Hasn't generated yet today
    case needsFace                 // User needs to upload face photo first
    case loading                   // Currently generating
    case success(UIImage)          // Image ready to display
    case error(String)             // Error occurred
}

@MainActor
class DailyImageViewModel: ObservableObject {

    @Published var state: DailyImageState = .idle
    @Published var showingPhotoPicker = false
    @Published var showingFullScreenImage = false
    @Published var fullScreenImage: UIImage?

    private let service = DailyImageService()
    private let cache = DailyImageCache.shared

    // Photo picker item
    @Published var selectedPhotoItem: PhotosPickerItem?
    @Published var selectedPhotoData: Data?

    // Today's date in YYYY-MM-DD format
    private var todayDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    // MARK: - Public Methods

    /// Load today's cached image if available
    func loadCachedImageIfNeeded() {
        let today = todayDate

        // Check if we have a cached image
        if let imageData = cache.loadImage(for: today),
           let image = UIImage(data: imageData) {
            state = .success(image)
            print("✅ Loaded cached image for today")
        } else if cache.getMetadata(for: today) != nil {
            // We know it was generated, but file is missing
            state = .idle
        } else if !cache.isFaceRegistered {
            state = .needsFace
        } else {
            state = .idle
        }
    }

    /// Generate today's image
    func generateImage(storyText: String) async {
        let today = todayDate

        // Check if user needs to register face first
        if !cache.isFaceRegistered {
            state = .needsFace
            return
        }

        // Check if already cached
        if let imageData = cache.loadImage(for: today),
           let image = UIImage(data: imageData) {
            state = .success(image)
            return
        } else if cache.getMetadata(for: today) != nil {
            // We know it was generated, but file is missing
            state = .idle
        } else if !cache.isFaceRegistered {
            state = .needsFace
        } else {
            state = .idle
        }

        state = .loading

        do {
            // Call API (no face data needed after first time)
            let result = try await service.fetchDailyImage(
                storyText: storyText,
                faceBase64: nil // Face already registered
            )

            // Parse base64 image
            guard let imageData = Data(base64Encoded: extractBase64(from: result.imageBase64)),
                  let image = UIImage(data: imageData) else {
                state = .error("Failed to parse image")
                return
            }

            // Save to cache
            cache.saveImage(imageData, for: today)
            cache.saveMetadata(for: today, cached: result.cached)

            // Update state
            state = .success(image)

            print("✅ Image generated successfully (cached: \(result.cached))")

        } catch let error as DailyImageError {
            state = .error(error.localizedDescription)
            print("❌ Daily image error: \(error.localizedDescription)")
        } catch {
            state = .error(error.localizedDescription)
            print("❌ Unexpected error: \(error.localizedDescription)")
        }
    }

    /// Handle photo selection from picker
    func handlePhotoSelection(_ item: PhotosPickerItem) async {
        guard let imageData = try? await item.loadTransferable(type: Data.self) else {
            state = .error("Failed to select photo")
            return
        }

        // Process and compress image
        guard let processedImage = processImage(imageData),
              let compressedData = compressImage(processedImage) else {
            state = .error("Failed to process photo")
            return
        }

        // Convert to base64 data URL
        let base64String = compressedData.base64EncodedString()
        let dataURL = "data:image/jpeg;base64,\(base64String)"

        // Store for upload
        selectedPhotoData = compressedData

        // Register face photo
        await registerFacePhoto(dataURL: dataURL, imageData: compressedData)
    }

    /// Register face photo with Worker (first time only)
    private func registerFacePhoto(dataURL: String, imageData: Data) async {
        // For first-time registration, we need story text
        // Use a placeholder story since we just want to register the face
        let placeholderStory = "Face registration"

        state = .loading

        do {
            let result = try await service.fetchDailyImage(
                storyText: placeholderStory,
                faceBase64: dataURL
            )

            // Mark as registered
            cache.markFaceRegistered()

            // Save the returned image if available
            if let returnedImageData = Data(base64Encoded: extractBase64(from: result.imageBase64)),
               let image = UIImage(data: returnedImageData) {
                cache.saveImage(returnedImageData, for: todayDate)
                cache.saveMetadata(for: todayDate, cached: result.cached)
                state = .success(image)
            } else {
                state = .idle
            }

            print("✅ Face photo registered successfully")

        } catch {
            state = .error("Photo upload failed: \(error.localizedDescription)")
            print("❌ Face registration error: \(error)")
        }
    }

    /// Show image full screen
    func showFullScreen() {
        if case .success(let image) = state {
            fullScreenImage = image
            showingFullScreenImage = true
        }
    }

    /// Reset for new day (called from app lifecycle)
    func checkForNewDay() {
        // If date changed from last check, reset state
        loadCachedImageIfNeeded()
    }

    // MARK: - Helper Methods

    private func processImage(_ data: Data) -> UIImage? {
        guard let image = UIImage(data: data) else { return nil }

        // Resize to max dimension 1024
        let maxDimension: CGFloat = 1024
        let size = image.size

        if size.width <= maxDimension && size.height <= maxDimension {
            return image
        }

        let scale = maxDimension / max(size.width, size.height)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()

        return resizedImage
    }

    private func compressImage(_ image: UIImage) -> Data? {
        return image.jpegData(compressionQuality: 0.85)
    }

    private func extractBase64(from dataURL: String) -> String {
        // Extract base64 string from "data:image/xxx;base64,<base64>"
        if let range = dataURL.range(of: "base64,") {
            return String(dataURL[range.upperBound...])
        }
        return dataURL
    }
}
