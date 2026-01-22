import Foundation

/// Manages local caching of daily generated images
class DailyImageCache {

    static let shared = DailyImageCache()

    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let facePhotoFilename = "face_photo.jpg"

    private struct Keys {
        static let faceRegistered = "daily_image_face_registered"
        static let metadataPrefix = "daily_image_metadata_"
    }

    private init() {
        // Use Caches directory for images
        let cachesURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = cachesURL.appendingPathComponent("DailyImages", isDirectory: true)

        // Create directory if needed
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Image Caching

    /// Save generated image to disk
    func saveImage(_ imageData: Data, for date: String) {
        let filename = imageName(for: date)
        let fileURL = cacheDirectory.appendingPathComponent(filename)

        do {
            try imageData.write(to: fileURL)
            print("💾 Saved image for date: \(date)")
        } catch {
            print("❌ Failed to save image: \(error)")
        }
    }

    /// Load cached image for date
    func loadImage(for date: String) -> Data? {
        let filename = imageName(for: date)
        let fileURL = cacheDirectory.appendingPathComponent(filename)

        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: fileURL)
            print("💾 Loaded cached image for date: \(date)")
            return data
        } catch {
            print("❌ Failed to load cached image: \(error)")
            return nil
        }
    }

    /// Delete cached image for date
    func deleteImage(for date: String) {
        let filename = imageName(for: date)
        let fileURL = cacheDirectory.appendingPathComponent(filename)

        try? fileManager.removeItem(at: fileURL)
    }

    /// Clear all cached images
    func clearAllImages() {
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    // MARK: - Metadata

    /// Save metadata for generated image
    func saveMetadata(for date: String, cached: Bool) {
        let metadata = ["date": date, "cached": cached] as [String : Any]
        UserDefaults.standard.set(metadata, forKey: Keys.metadataPrefix + date)
    }

    /// Get metadata for date
    func getMetadata(for date: String) -> (date: String, cached: Bool)? {
        guard let metadata = UserDefaults.standard.dictionary(forKey: Keys.metadataPrefix + date),
              let dateValue = metadata["date"] as? String,
              let cached = metadata["cached"] as? Bool else {
            return nil
        }
        return (dateValue, cached)
    }

    /// Check if image exists for date
    func hasImage(for date: String) -> Bool {
        return loadImage(for: date) != nil
    }

    // MARK: - Face Registration

    /// Check if user has registered a face photo
    var isFaceRegistered: Bool {
        get {
            return UserDefaults.standard.bool(forKey: Keys.faceRegistered)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.faceRegistered)
        }
    }

    /// Mark face as registered
    func markFaceRegistered() {
        isFaceRegistered = true
        print("✅ Face photo registered")
    }

    /// Clear face registration (for testing/reupload)
    func clearFaceRegistration() {
        isFaceRegistered = false
        clearFacePhoto()
        print("🔄 Face registration cleared")
    }

    // MARK: - Helper Methods

    private func imageName(for date: String) -> String {
        return "daily_image_\(date).png"
    }

    // MARK: - Face Photo Storage

    func saveFacePhoto(_ data: Data) {
        let fileURL = cacheDirectory.appendingPathComponent(facePhotoFilename)
        do {
            try data.write(to: fileURL)
            print("💾 Saved face photo")
        } catch {
            print("❌ Failed to save face photo: \(error)")
        }
    }

    func loadFacePhoto() -> Data? {
        let fileURL = cacheDirectory.appendingPathComponent(facePhotoFilename)
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }
        do {
            return try Data(contentsOf: fileURL)
        } catch {
            print("❌ Failed to load face photo: \(error)")
            return nil
        }
    }

    func clearFacePhoto() {
        let fileURL = cacheDirectory.appendingPathComponent(facePhotoFilename)
        try? fileManager.removeItem(at: fileURL)
    }

    /// Get cache size in bytes
    func getCacheSize() -> Int64 {
        guard let contents = try? fileManager.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else {
            return 0
        }

        return contents.reduce(0) { total, url in
            guard let resourceValues = try? url.resourceValues(forKeys: [.fileSizeKey]),
                  let fileSize = resourceValues.fileSize else {
                return total
            }
            return total + Int64(fileSize)
        }
    }
}
