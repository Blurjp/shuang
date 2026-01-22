import SwiftUI
import StoreKit

struct UpgradeView: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var subscriptionManager: SubscriptionManager

    @State private var selectedTier: SubscriptionTier?
    @State private var isLoadingPurchase = false

    enum SubscriptionTier: String, CaseIterable {
        case monthly = "com.dailyprotagonist.premium.monthly"
        case yearly = "com.dailyprotagonist.premium.yearly"

        var displayName: String {
            switch self {
            case .monthly: return "Monthly Premium"
            case .yearly: return "Yearly Premium"
            }
        }

        var description: String {
            switch self {
            case .monthly: return "Billed monthly"
            case .yearly: return "Billed yearly, save 33%"
            }
        }

        var price: String {
            switch self {
            case .monthly: return "$9.99/mo"
            case .yearly: return "$79.99/yr"
            }
        }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                ScrollView {
                    VStack(spacing: 24) {
                        headerView
                        featuresView
                        subscriptionOptionsView
                        Spacer()
                        ctaView
                    }
                }

                // Debug mode banner
                if subscriptionManager.products.isEmpty {
                    HStack {
                        Image(systemName: "wrench.and.screwdriver.fill")
                            .font(.caption)
                        Text("DEBUG MODE - Tap Subscribe to Upgrade for Free")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [Color.purple, Color.pink]),
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(20)
                    .shadow(radius: 5)
                    .padding(.top, 8)
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
                if subscriptionManager.products.isEmpty || subscriptionManager.products.contains(where: { $0.productIdentifier.contains("monthly") }) {
                    selectedTier = .monthly
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
        VStack(spacing: 12) {
            ForEach(SubscriptionTier.allCases, id: \.rawValue) { tier in
                SubscriptionOptionRow(
                    tier: tier,
                    isSelected: selectedTier == tier
                ) {
                    selectedTier = tier
                }
            }
        }
        .padding(.horizontal)
    }

    private var ctaView: some View {
        VStack(spacing: 12) {
            // Show error message if any
            if let error = subscriptionManager.errorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.red)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(8)
            }

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
                .disabled(selectedTier == nil)
                .opacity(selectedTier == nil ? 0.6 : 1)
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
        guard let tier = selectedTier else {
            return "Select a Plan"
        }
        return "Subscribe \(tier.price)"
    }

    private func purchaseSubscription() {
        guard let tier = selectedTier else { return }

        // If we have real StoreKit products, use them
        if let product = subscriptionManager.products.first(where: { $0.productIdentifier == tier.rawValue }) {
            Task {
                isLoadingPurchase = true
                do {
                    try await subscriptionManager.purchase(product)
                    await MainActor.run {
                        isPresented = false
                    }
                } catch {
                    // Error already handled by subscriptionManager
                }
                isLoadingPurchase = false
            }
        } else {
            // Development mode - simulate upgrade without StoreKit
            Task {
                isLoadingPurchase = true
                try? await Task.sleep(nanoseconds: 1_000_000_000) // Simulate network call
                await MainActor.run {
                    // Set premium status directly in dev mode
                    subscriptionManager.isPremium = true
                    subscriptionManager.subscriptionStatus = .subscribed(expirationDate: nil)
                    isLoadingPurchase = false
                    isPresented = false
                }
            }
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
    let tier: UpgradeView.SubscriptionTier
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(tier.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(tier.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Text(tier.price)
                    .font(.headline)
                    .foregroundColor(.blue)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.title3)
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
}

#Preview {
    UpgradeView(isPresented: .constant(true))
}
