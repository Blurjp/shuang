import SwiftUI
import StoreKit

struct UpgradeView: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var subscriptionManager = SubscriptionManager.shared

    @State private var selectedProduct: SKProduct?
    @State private var isLoadingPurchase = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    headerView
                    featuresView
                    subscriptionOptionsView
                    Spacer()
                    ctaView
                }
            }
            .navigationTitle("Premium")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        isPresented = false
                    }
                }
            }
            .alert("Error", isPresented: .constant(subscriptionManager.errorMessage != nil)) {
                Button("OK") {
                    subscriptionManager.errorMessage = nil
                }
            } message: {
                if let error = subscriptionManager.errorMessage {
                    Text(error)
                }
            }
            .task {
                await subscriptionManager.loadProducts()
                // Auto-select monthly tier
                if let monthlyProduct = subscriptionManager.products.first(where: { $0.productIdentifier.contains("monthly") }) {
                    selectedProduct = monthlyProduct
                }
            }
        }
    }

    private var headerView: some View {
        VStack(spacing: 12) {
            Image(systemName: "crown.fill")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Text("Upgrade to Premium")
                .font(.title)
                .fontWeight(.bold)
            Text("Unlock Unlimited Stories")
                .foregroundColor(.secondary)
        }
        .padding(.top, 40)
    }

    private var featuresView: some View {
        VStack(spacing: 16) {
            FeatureRow(icon: "infinity", title: "Unlimited Generation", description: "Generate stories without any daily limits")
            FeatureRow(icon: "wand.and.stars", title: "Priority Processing", description: "Get faster AI content generation")
            FeatureRow(icon: "sparkles", title: "Exclusive Styles", description: "Access all story genres and moods")
            FeatureRow(icon: "photo.on.rectangle.angled", title: "HD Images", description: "Higher quality personalized images")
            FeatureRow(icon: "badge.plus", title: "Premium Features", description: "Early access to new features")
        }
        .padding(.horizontal)
    }

    private var subscriptionOptionsView: some View {
        Group {
            if !subscriptionManager.products.isEmpty {
                VStack(spacing: 12) {
                    ForEach(subscriptionManager.products, id: \.productIdentifier) { product in
                        SubscriptionOptionRow(
                            product: product,
                            isSelected: selectedProduct?.productIdentifier == product.productIdentifier
                        ) {
                            selectedProduct = product
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var ctaView: some View {
        VStack(spacing: 12) {
            if isLoadingPurchase || subscriptionManager.isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)
            } else {
                Button(action: purchaseSubscription) {
                    Text(buttonText)
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.yellow, Color.orange]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                }
                .disabled(selectedProduct == nil)
                .opacity(selectedProduct == nil ? 0.6 : 1)
            }

            Text("Cancel anytime, no hidden fees")
                .font(.caption)
                .foregroundColor(.secondary)

            // Restore link
            Button("Restore Purchase") {
                Task {
                    await subscriptionManager.restorePurchases()
                }
            }
            .font(.caption)
            .foregroundColor(.blue)
        }
        .padding(.horizontal, 32)
        .padding(.bottom, 40)
    }

    private var buttonText: String {
        if let product = selectedProduct {
            let priceString = product.priceLocale.currencySymbol ?? "$"
            let price = product.price.stringValue
            return "Subscribe \(priceString)\(price)"
        }
        return "Select a Plan"
    }

    private func purchaseSubscription() {
        guard let product = selectedProduct else { return }

        Task {
            isLoadingPurchase = true
            do {
                try await subscriptionManager.purchase(product)
                // Success
                await MainActor.run {
                    isPresented = false
                }
            } catch {
                // Error is already handled by SubscriptionManager
            }
            isLoadingPurchase = false
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(12)
    }
}

struct SubscriptionOptionRow: View {
    let product: SKProduct
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(displayName)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(displayPrice)
                    .font(.headline)
                    .foregroundColor(.blue)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.blue.opacity(0.1) : Color.gray.opacity(0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var displayName: String {
        if product.productIdentifier.contains("monthly") {
            return "Monthly Premium"
        } else if product.productIdentifier.contains("yearly") {
            return "Yearly Premium"
        }
        return product.localizedTitle
    }

    private var description: String {
        if product.productIdentifier.contains("monthly") {
            return "Billed monthly"
        } else if product.productIdentifier.contains("yearly") {
            return "Billed yearly, save 33%"
        }
        return product.localizedDescription
    }

    private var displayPrice: String {
        let priceString = product.priceLocale.currencySymbol ?? "$"
        let price = product.price.stringValue
        return "\(priceString)\(price)"
    }
}

#Preview {
    UpgradeView(isPresented: .constant(true))
}
