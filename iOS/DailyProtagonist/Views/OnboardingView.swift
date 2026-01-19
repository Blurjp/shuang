import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedGender: User.Gender = .male
    @State private var selectedGenre: User.Genre = .modern
    @State private var selectedEmotion: User.Emotion = .growth
    @State private var currentStep = 0
    @State private var isLoading = false
    @State private var errorMessage = ""

    private let steps = [
        ("Select Gender", "male"),
        ("Select Genre", "genre"),
        ("Select Mood", "emotion")
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Progress
            HStack {
                ForEach(0..<steps.count, id: \.self) { index in
                    Circle()
                        .fill(index <= currentStep ? Color.blue : Color.gray.opacity(0.3))
                        .frame(width: 10, height: 10)
                    if index < steps.count - 1 {
                        Rectangle()
                            .fill(index < currentStep ? Color.blue : Color.gray.opacity(0.3))
                            .frame(height: 2)
                            .frame(maxWidth: CGFloat.infinity)
                    }
                }
            }
            .padding()

            Spacer()

            // Questions
            Group {
                switch currentStep {
                case 0:
                    genderSelection
                case 1:
                    genreSelection
                case 2:
                    emotionSelection
                default:
                    EmptyView()
                }
            }
            .transition(.slide)

            // Error message
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
                    .padding(.horizontal)
            }

            Spacer()

            // Navigation buttons
            HStack(spacing: 20) {
                if currentStep > 0 {
                    Button("Back") {
                        withAnimation {
                            currentStep -= 1
                        }
                    }
                    .frame(maxWidth: CGFloat.infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(12)
                }

                Button(currentStep == steps.count - 1 ? "Complete" : "Next") {
                    if currentStep < steps.count - 1 {
                        withAnimation {
                            currentStep += 1
                        }
                    } else {
                        Task {
                            await completeOnboarding()
                        }
                    }
                }
                .frame(maxWidth: CGFloat.infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .disabled(isLoading)
                .overlay {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    }
                }
            }
            .padding()
        }
    }

    private var genderSelection: some View {
        VStack(spacing: 24) {
            Text(steps[0].0)
                .font(.title2)
                .fontWeight(.bold)

            ForEach(User.Gender.allCases, id: \.self) { gender in
                Button(action: {
                    selectedGender = gender
                }) {
                    HStack {
                        Text(gender.displayName)
                            .font(.title3)
                        Spacer()
                        if selectedGender == gender {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding()
                    .background(selectedGender == gender ? Color.blue.opacity(0.1) : Color.clear)
                    .cornerRadius(12)
                }
                .foregroundColor(.primary)
            }
        }
        .padding()
    }

    private var genreSelection: some View {
        VStack(spacing: 24) {
            Text(steps[1].0)
                .font(.title2)
                .fontWeight(.bold)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(User.Genre.allCases, id: \.self) { genre in
                    Button(action: {
                        selectedGenre = genre
                    }) {
                        VStack {
                            Text(genre.displayName)
                                .font(.headline)
                        }
                        .frame(maxWidth: CGFloat.infinity)
                        .padding()
                        .background(selectedGenre == genre ? Color.blue : Color.gray.opacity(0.2))
                        .foregroundColor(selectedGenre == genre ? .white : .primary)
                        .cornerRadius(12)
                    }
                }
            }
        }
        .padding()
    }

    private var emotionSelection: some View {
        VStack(spacing: 24) {
            Text(steps[2].0)
                .font(.title2)
                .fontWeight(.bold)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(User.Emotion.allCases, id: \.self) { emotion in
                    Button(action: {
                        selectedEmotion = emotion
                    }) {
                        VStack(spacing: 8) {
                            Text(emotion.displayName)
                                .font(.headline)
                        }
                        .frame(maxWidth: CGFloat.infinity)
                        .padding()
                        .background(selectedEmotion == emotion ? Color.blue : Color.gray.opacity(0.2))
                        .foregroundColor(selectedEmotion == emotion ? .white : .primary)
                        .cornerRadius(12)
                    }
                }
            }
        }
        .padding()
    }

    private func completeOnboarding() async {
        isLoading = true
        errorMessage = ""

        print("🟢 Starting onboarding with: \(selectedGender.rawValue), \(selectedGenre.rawValue), \(selectedEmotion.rawValue)")

        do {
            try await authManager.completeOnboarding(
                gender: selectedGender,
                genrePreference: selectedGenre,
                emotionPreference: selectedEmotion
            )
            print("🟢 Onboarding completed successfully!")
        } catch {
            print("❌ Onboarding failed: \(error)")
            print("❌ Error description: \(error.localizedDescription)")
            errorMessage = "Failed to save: \(error.localizedDescription)"
        }

        isLoading = false
    }
}
