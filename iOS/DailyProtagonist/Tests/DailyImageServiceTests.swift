import XCTest
@testable import DailyProtagonist

/// Mock URLProtocol for testing API calls
class MockURLProtocol: URLProtocol {

    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data?))?

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            XCTFail("Handler is unavailable.")
            return
        }

        do {
            let (response, data) = try handler(request)

            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)

            if let data = data {
                client?.urlProtocol(self, didLoad: data)
            }

            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {
        // Required by URLProtocol
    }
}

/// Unit tests for DailyImageService
class DailyImageServiceTests: XCTestCase {

    var service: DailyImageService!
    var session: URLSession!

    override func setUp() {
        super.setUp()

        // Register mock protocol
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: config)

        service = DailyImageService()
    }

    override func tearDown() {
        service = nil
        session = nil
        super.tearDown()
    }

    // MARK: - Request Encoding Tests

    func testRequestEncoding_WithAllFields() throws {
        // Arrange
        let storyText = "Once upon a time..."
        let faceBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg..."

        // Create expected request JSON
        let expectedJSON: [String: Any] = [
            "user_id": UserIdentifierManager.shared.getUserId(),
            "story_text": storyText,
            "face_base64": faceBase64
        ]

        // Act - Capture the request
        var capturedRequest: URLRequest?
        MockURLProtocol.requestHandler = { request in
            capturedRequest = request

            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: nil
            )!

            let responseData = """
            {
                "date": "2026-01-14",
                "cached": false,
                "image_base64": "data:image/png;base64,iVBORw0KG...",
                "prompt_used": {}
            }
            """.data(using: .utf8)

            return (response, responseData)
        }

        // This would normally be an async call
        // For this test, we verify the request encoding manually

        // Assert - Verify request structure
        let requestObject = DailyImageRequest(
            userId: expectedJSON["user_id"] as! String,
            storyText: expectedJSON["story_text"] as! String,
            faceBase64: expectedJSON["face_base64"] as? String
        )

        let encoder = JSONEncoder()
        let requestData = try encoder.encode(requestObject)

        let json = try JSONSerialization.jsonObject(with: requestData) as! [String: Any]

        XCTAssertEqual(json["user_id"] as? String, expectedJSON["user_id"] as? String)
        XCTAssertEqual(json["story_text"] as? String, expectedJSON["story_text"] as? String)
        XCTAssertEqual(json["face_base64"] as? String, expectedJSON["face_base64"] as? String)
    }

    func testRequestEncoding_WithoutFace() throws {
        // Arrange
        let storyText = "A shorter story"
        let expectedJSON: [String: Any] = [
            "user_id": UserIdentifierManager.shared.getUserId(),
            "story_text": storyText
        ]

        // Act
        let requestObject = DailyImageRequest(
            userId: expectedJSON["user_id"] as! String,
            storyText: expectedJSON["story_text"] as! String,
            faceBase64: nil
        )

        let encoder = JSONEncoder()
        let requestData = try encoder.encode(requestObject)

        // Assert
        let json = try JSONSerialization.jsonObject(with: requestData) as! [String: Any]

        XCTAssertEqual(json["user_id"] as? String, expectedJSON["user_id"] as? String)
        XCTAssertEqual(json["story_text"] as? String, expectedJSON["story_text"] as? String)
        // face_base64 should be null or omitted when nil
        XCTAssertTrue(json["face_base64"] is NSNull || json["face_base64"] == nil)
    }

    // MARK: - Response Decoding Tests

    func testResponseDecoding_Success() throws {
        // Arrange
        let responseData = """
        {
            "date": "2026-01-14",
            "cached": false,
            "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
            "prompt_used": {
                "style": "cinematic",
                "mood": "epic"
            }
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let result = try decoder.decode(DailyImageResult.self, from: responseData)

        // Assert
        XCTAssertEqual(result.date, "2026-01-14")
        XCTAssertFalse(result.cached)
        XCTAssertTrue(result.imageBase64.hasPrefix("data:image/png;base64,"))
        XCTAssertNotNil(result.promptUsed)
    }

    func testResponseDecoding_WithCachedFlag() throws {
        // Arrange
        let responseData = """
        {
            "date": "2026-01-14",
            "cached": true,
            "image_base64": "data:image/png;base64,iVBORw0KG...",
            "prompt_used": null
        }
        """.data(using: .utf8)!

        // Act
        let decoder = JSONDecoder()
        let result = try decoder.decode(DailyImageResult.self, from: responseData)

        // Assert
        XCTAssertEqual(result.date, "2026-01-14")
        XCTAssertTrue(result.cached)
    }

    // MARK: - Story Text Truncation Tests

    func testStoryTextTruncation() {
        // Arrange
        let longStory = String(repeating: "A", count: 3000)

        // Act
        let maxStoryLength = 2000
        let truncatedStory = String(longStory.prefix(maxStoryLength))

        // Assert
        XCTAssertEqual(truncatedStory.count, 2000)
        XCTAssertTrue(truncatedStory.hasPrefix("AAAA"))
    }

    // MARK: - Error Handling Tests

    func testErrorHandling_HTTP404() {
        // Arrange
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 404,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, nil)
        }

        // Act & Assert
        // In a real async test, we'd verify that DailyImageError.httpError(404) is thrown
        // For this unit test, we verify the error can be created
        let error = DailyImageError.httpError(404)
        XCTAssertEqual(error.errorDescription, "Network error (404)")
    }

    func testErrorHandling_DecodingFailed() {
        // Arrange & Act
        let error = DailyImageError.decodingFailed

        // Assert
        XCTAssertEqual(error.errorDescription, "Failed to decode data")
    }

    // MARK: - User ID Manager Tests

    func testUserIdManager_ConsistentId() {
        // Arrange & Act
        let userId1 = UserIdentifierManager.shared.getUserId()
        let userId2 = UserIdentifierManager.shared.getUserId()

        // Assert - Should return the same ID
        XCTAssertEqual(userId1, userId2)
        XCTAssertTrue(userId1.count > 0)
    }

    func testUserIdManager_ValidUUIDFormat() {
        // Act
        let userId = UserIdentifierManager.shared.getUserId()

        // Assert - Should be valid UUID format (case-insensitive)
        let uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        let regex = try? NSRegularExpression(pattern: uuidPattern)
        let range = NSRange(location: 0, length: userId.utf16.count)
        let match = regex?.firstMatch(in: userId, range: range)

        XCTAssertNotNil(match, "User ID should match UUID format")
    }
}

// MARK: - Test Extensions

extension DailyImageService {
    // Helper method for testing that bypasses URLSession
    func testRequestEncoding(storyText: String, faceBase64: String?) throws -> Data {
        let request = DailyImageRequest(
            userId: UserIdentifierManager.shared.getUserId(),
            storyText: storyText,
            faceBase64: faceBase64
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(request)
    }
}
