# CLAUDE.md

**Project:** {{PROJECT_NAME}}
**Version:** 0.1.0
**Type:** mobile

---

## Project Overview

{{PROJECT_DESCRIPTION}}

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Flutter |
| Language | Dart |
| State Management | Riverpod or Bloc |
| Navigation | go_router |
| HTTP | dio |
| Storage | shared_preferences, sqflite |
| Testing | flutter_test, integration_test |

## Development Commands

```bash
# Setup
flutter pub get              # Install dependencies
flutter pub upgrade          # Upgrade dependencies

# Development
flutter run                  # Run on connected device
flutter run -d chrome        # Run on web (for testing)
flutter run --release        # Run in release mode

# Build
flutter build apk            # Build Android APK
flutter build appbundle      # Build Android App Bundle
flutter build ios            # Build iOS (macOS only)
flutter build ipa            # Build iOS IPA (macOS only)

# Testing
flutter test                 # Run unit/widget tests
flutter test --coverage      # Run tests with coverage
flutter test integration_test # Run integration tests

# Code Quality
flutter analyze              # Static analysis
dart format .                # Format code
```

## Project Structure

```
{{PROJECT_NAME}}/
├── lib/
│   ├── main.dart           # Entry point
│   ├── app.dart            # App widget
│   ├── core/               # Core utilities
│   │   ├── constants/
│   │   ├── exceptions/
│   │   ├── extensions/
│   │   └── utils/
│   ├── data/               # Data layer
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── presentation/       # UI layer
│   │   ├── pages/
│   │   ├── widgets/
│   │   └── providers/      # Riverpod providers
│   └── routing/            # Navigation
│       └── router.dart
├── test/                   # Unit/widget tests
├── integration_test/       # Integration tests
├── android/                # Android platform code
├── ios/                    # iOS platform code
├── assets/                 # Images, fonts, etc.
└── pubspec.yaml           # Dependencies
```

## Environment Configuration

```dart
// lib/core/constants/env.dart
abstract class Env {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://api.example.com',
  );
}
```

```bash
# Build with environment
flutter build apk --dart-define=API_URL=https://api.prod.com
```

## Project-Specific Rules

### Architecture
- Follow clean architecture principles
- Separate data, domain, and presentation layers
- Use repositories for data access

### State Management (Riverpod)
```dart
// Prefer Riverpod for state management
final userProvider = FutureProvider<User>((ref) async {
  final repository = ref.watch(userRepositoryProvider);
  return repository.getCurrentUser();
});
```

### API Calls
- Use dio for HTTP requests
- Validate all API responses
- Handle errors gracefully with user-friendly messages

### Input Validation
```dart
// Validate all user input
String? validateEmail(String? value) {
  if (value == null || value.isEmpty) {
    return 'Email is required';
  }
  if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
    return 'Enter a valid email';
  }
  return null;
}
```

### Security
- Never store sensitive data in plain text
- Use flutter_secure_storage for secrets
- Implement certificate pinning for API calls
- Obfuscate release builds

### Testing
- Write widget tests for UI components
- Write unit tests for business logic
- Write integration tests for critical flows
- Target 80%+ code coverage

---

**Parent Config:** See `~/CLAUDE.md` for global standards (adapted for Dart/Flutter).
