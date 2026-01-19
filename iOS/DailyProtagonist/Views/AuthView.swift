import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Logo and Title
                VStack(spacing: 12) {
                    Text("📖")
                        .font(.system(size: 80))
                    Text("Daily Protagonist")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Your Daily Story - Personalized Adventures")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Login Form
                VStack(spacing: 16) {
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()

                    Button(action: {
                        Task {
                            await loginWithEmail()
                        }
                    }) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Sign In / Sign Up")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: CGFloat.infinity)
                    .padding()
                    .background(email.isEmpty ? Color.gray : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .disabled(email.isEmpty || isLoading)

                    Text("Enter your email to sign in or register")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 24)

                // Anonymous Login
                Button(action: {
                    Task {
                        await loginAnonymously()
                    }
                }) {
                    if isLoading {
                        HStack {
                            ProgressView()
                            Text("Signing in...")
                        }
                    } else {
                        Text("Try Anonymously")
                            .fontWeight(.semibold)
                    }
                }
                .font(.headline)
                .foregroundColor(.blue)

                Spacer()
            }
            .navigationTitle("Welcome")
            .navigationBarHidden(true)
        }
    }

    private func loginWithEmail() async {
        isLoading = true
        errorMessage = ""

        do {
            // Use register which handles both existing and new users
            try await authManager.register(email: email)
        } catch {
            errorMessage = "Sign in failed: \(error.localizedDescription)"
            print("❌ API error: \(error)")
        }

        isLoading = false
    }

    private func loginAnonymously() async {
        isLoading = true
        errorMessage = ""

        let anonymousId = UUID().uuidString

        do {
            try await authManager.register(anonymousId: anonymousId)
        } catch {
            errorMessage = "Failed: \(error.localizedDescription)"
            print("❌ API error: \(error)")
        }

        isLoading = false
    }
}
