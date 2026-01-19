import Foundation
import StoreKit

class SubscriptionManager: NSObject, ObservableObject {
    static let shared = SubscriptionManager()

    // Published properties
    @Published var isPremium = false
    @Published var subscriptionStatus: SubscriptionStatus = .notSubscribed
    @Published var products: [SKProduct] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // AuthManager reference (injected)
    weak var authManager: AuthManager?

    // Delegates (separate classes for proper protocol conformance)
    private let productsRequestDelegate: ProductsRequestDelegate
    private let transactionObserver: TransactionObserver

    // Subscription tiers
    enum SubscriptionTier: String {
        case monthly = "com.dailyprotagonist.premium.monthly"
        case yearly = "com.dailyprotagonist.premium.yearly"

        var displayName: String {
            switch self {
            case .monthly: return "Monthly Premium"
            case .yearly: return "Yearly Premium"
            }
        }

        var price: String {
            switch self {
            case .monthly: return "$9.99/month"
            case .yearly: return "$79.99/year"
            }
        }
    }

    enum SubscriptionStatus {
        case notSubscribed
        case subscribed(expirationDate: Date?)
        case expired
        case inGracePeriod
        case inBillingRetry

        var isActive: Bool {
            switch self {
            case .subscribed, .inGracePeriod, .inBillingRetry:
                return true
            case .notSubscribed, .expired:
                return false
            }
        }
    }

    private var productRequest: SKProductsRequest?

    private override init() {
        self.productsRequestDelegate = ProductsRequestDelegate()
        self.transactionObserver = TransactionObserver()
        super.init()
        self.productsRequestDelegate.manager = self
        self.transactionObserver.manager = self
        SKPaymentQueue.default().add(transactionObserver)
    }

    // MARK: - Product Loading

    func loadProducts() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        await withCheckedContinuation { continuation in
            self.productsRequestDelegate.completion = { success, error in
                Task { @MainActor in
                    if success {
                        print("✅ Loaded \(self.products.count) products")
                    } else {
                        print("❌ Failed to load products: \(error?.localizedDescription ?? "Unknown error")")
                        self.errorMessage = "Failed to load products: \(error?.localizedDescription ?? "Unknown error")"
                    }
                    self.isLoading = false
                }
                continuation.resume()
            }

            let request = SKProductsRequest(productIdentifiers: [
                SubscriptionTier.monthly.rawValue,
                SubscriptionTier.yearly.rawValue
            ])
            request.delegate = self.productsRequestDelegate
            productRequest = request
            request.start()
        }
    }

    // MARK: - Purchase

    func purchase(_ product: SKProduct) async throws {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        let payment = SKPayment(product: product)
        SKPaymentQueue.default().add(payment)

        // Wait for transaction to complete
        // In a real app, you'd handle this with proper async/await and callbacks
        await MainActor.run {
            isLoading = false
        }
    }

    // MARK: - Restore

    func restorePurchases() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }

        SKPaymentQueue.default().restoreCompletedTransactions()

        // Wait for restore to complete
        await MainActor.run {
            isLoading = false
        }
    }

    // MARK: - Subscription Status

    func loadSubscriptionStatus() async {
        // For now, we'll use backend status
        // StoreKit 1 requires checking receipts locally which is complex
        print("📊 Loading subscription status from backend")
    }

    // MARK: - Manage Subscription

    func manageSubscription() {
        // Open App Store subscription management
        if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Backend Sync

    func syncSubscriptionWithBackend(token: String) async {
        do {
            let apiService = APIService.shared
            _ = try await apiService.updateSubscriptionStatus(
                isPremium: true,
                expirationDate: nil,
                token: token
            )
            print("✅ Synced subscription with backend")
        } catch {
            print("❌ Failed to sync subscription: \(error)")
        }
    }
}

// MARK: - Products Request Delegate (Separate class for proper @objc conformance)

class ProductsRequestDelegate: NSObject, SKProductsRequestDelegate {
    weak var manager: SubscriptionManager?
    var completion: ((Bool, Error?) -> Void)?

    @objc nonisolated func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        Task { @MainActor in
            guard let manager = self.manager else { return }
            manager.products = response.products.sorted { $0.price.doubleValue < $1.price.doubleValue }
        }
        completion?(true, nil)
    }

    @objc nonisolated func request(_ request: SKRequest, didFailWithError error: Error) {
        completion?(false, error)
    }
}

// MARK: - Transaction Observer (Separate class for proper @objc conformance)

class TransactionObserver: NSObject, SKPaymentTransactionObserver {
    weak var manager: SubscriptionManager?

    @objc nonisolated func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchased, .restored:
                // Transaction successful
                Task { @MainActor in
                    guard let manager = self.manager else { return }
                    manager.isPremium = true
                    manager.subscriptionStatus = .subscribed(expirationDate: nil)

                    // Notify backend
                    if let authManager = manager.authManager,
                       let token = authManager.getAuthToken() {
                        await manager.syncSubscriptionWithBackend(token: token)
                    }
                }

                SKPaymentQueue.default().finishTransaction(transaction)

            case .failed:
                // Transaction failed
                Task { @MainActor in
                    guard let manager = self.manager else { return }
                    if let error = transaction.error {
                        manager.errorMessage = "Purchase failed: \(error.localizedDescription)"
                    }
                }
                SKPaymentQueue.default().finishTransaction(transaction)

            case .purchasing:
                // Transaction is being processed
                break

            case .deferred:
                // Transaction deferred (e.g., asking for parental approval)
                Task { @MainActor in
                    guard let manager = self.manager else { return }
                    manager.errorMessage = "Purchase requires approval"
                }
                SKPaymentQueue.default().finishTransaction(transaction)

            @unknown default:
                break
            }
        }
    }

    @objc nonisolated func paymentQueueRestoreCompletedTransactionsFinished(_ queue: SKPaymentQueue) {
        Task { @MainActor in
            guard let manager = self.manager else { return }
            print("✅ Restore completed")
            await manager.loadSubscriptionStatus()
        }
    }
}

// MARK: - Errors

enum SubscriptionError: LocalizedError {
    case userCancelled
    case purchasePending
    case verificationFailed
    case unknownError

    var errorDescription: String? {
        switch self {
        case .userCancelled:
            return "Purchase cancelled"
        case .purchasePending:
            return "Purchase pending"
        case .verificationFailed:
            return "Transaction verification failed"
        case .unknownError:
            return "Unknown error"
        }
    }
}
