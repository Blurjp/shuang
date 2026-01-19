import Foundation
import SwiftUI
import UIKit

struct RemoteImageView<Content: View, Placeholder: View, Failure: View>: View {
    let urlString: String?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder
    let failure: () -> Failure

    init(
        urlString: String?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder,
        @ViewBuilder failure: @escaping () -> Failure
    ) {
        self.urlString = urlString
        self.content = content
        self.placeholder = placeholder
        self.failure = failure
    }

    init(
        urlString: String?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) where Failure == Placeholder {
        self.urlString = urlString
        self.content = content
        self.placeholder = placeholder
        self.failure = placeholder
    }

    var body: some View {
        if let image = decodeDataImage(from: urlString) {
            content(Image(uiImage: image))
        } else if let url = urlFromString(urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    content(image)
                case .empty:
                    placeholder()
                case .failure:
                    failure()
                @unknown default:
                    placeholder()
                }
            }
        } else {
            placeholder()
        }
    }

    private func urlFromString(_ string: String?) -> URL? {
        guard let string = string, !string.isEmpty else { return nil }
        return URL(string: string)
    }

    private func decodeDataImage(from string: String?) -> UIImage? {
        guard let string = string, string.hasPrefix("data:") else { return nil }
        guard let base64Range = string.range(of: "base64,") else { return nil }
        let base64 = String(string[base64Range.upperBound...])
        guard let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }
}
