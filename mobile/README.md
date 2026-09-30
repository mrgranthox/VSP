# VSP Mobile — Flutter Client Application

> **Production Industry Standard Flutter Client**: Complete 41-screen vocational marketplace application for iOS and Android supporting dual personas: **Customer** (clients seeking skilled tradespeople) and **Worker** (vocational service professionals). Built with Clean Architecture, Provider state management, offline font resilience, and real-time WebSocket communication.

[![Flutter Analyze](https://img.shields.io/badge/Flutter%20Analyze-0%20Issues-brightgreen.svg)](.)
[![Flutter Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-brightgreen.svg)](.)
[![Flutter Version](https://img.shields.io/badge/Flutter-3.47-blue.svg)](.)
[![Dart Version](https://img.shields.io/badge/Dart-3.13-blue.svg)](.)

---

## Table of Contents

- [Architecture & Design Pattern](#architecture--design-pattern)
- [Directory Layout](#directory-layout)
- [Design System & Typography](#design-system--typography)
- [Screen Catalog (41 Screens)](#screen-catalog-41-screens)
- [State Management Providers](#state-management-providers)
- [Network & Real-Time Gateway](#network--real-time-gateway)
- [Offline Resilience & Device Adaptation](#offline-resilience--device-adaptation)
- [Testing & Quality Verification](#testing--quality-verification)
- [Physical Device Deployment (ADB Reverse)](#physical-device-deployment-adb-reverse)

---

## Architecture & Design Pattern

The application follows **Clean Architecture** principles decoupled into three distinct layers:

```
lib/
├── core/            # Global singletons, network clients, storage, and theme definitions
├── data/            # Domain models and repository implementations
└── presentation/    # UI layer (Screens, Widgets, Providers, and GoRouter configuration)
```

### Layer Responsibilities
1. **Core Layer (`lib/core/`)**:
   - `ApiClient`: HTTP client wrapper managing base URLs, authorization bearer headers, timeout handling, and structured JSON parsing.
   - `WebSocketClient`: Persistent `WebSocketChannel` client with automatic reconnection, heartbeat pings, and event dispatchers.
   - `StorageService`: Persistent key-value storage wrapper (`SharedPreferences`) for session tokens and cached user profiles.
   - `AppTheme` / `AppColors`: Centralized design system tokens honoring Nunito & Inter typography and branded palettes.
2. **Data Layer (`lib/data/`)**:
   - **Models**: Strongly-typed data models with `fromJson` / `toJson` serialization, copy methods, and defensive null-safety handling.
   - **Repositories**: 11 domain repositories providing clean abstraction between UI state and network operations.
3. **Presentation Layer (`lib/presentation/`)**:
   - **Providers**: 9 `ChangeNotifier` state containers handling reactive UI updates.
   - **Routes**: `GoRouter` declarative router with route aliasing for instant shorthand navigation.
   - **Screens & Widgets**: 41 screens organized by persona and modular UI components.

---

## Directory Layout

```text
mobile/
├── android/                   # Native Android host configuration & manifest
├── ios/                       # Native iOS runner & Xcode configuration
├── lib/
│   ├── core/
│   │   ├── constants/         # ApiConstants, AppColors, AppTheme
│   │   ├── network/           # ApiClient, WebSocketClient
│   │   ├── storage/           # StorageService (token & profile persistence)
│   │   └── theme/             # Material 3 light theme with Google Fonts
│   ├── data/
│   │   ├── models/            # User, WorkerProfile, Booking, ServiceRequest, Chat, Review
│   │   └── repositories/      # AuthRepository, BookingsRepository, ChatRepository, etc.
│   ├── presentation/
│   │   ├── providers/         # Auth, Booking, Chat, Feed, Home, Notifications, etc.
│   │   ├── routes/            # AppRouter (GoRouter setup + route redirects)
│   │   ├── screens/
│   │   │   ├── auth/          # Splash, Onboarding, Login, Register, Forgot Password
│   │   │   ├── customer/      # CustomerShell + 18 customer feature screens
│   │   │   └── worker/        # WorkerShell + 10 worker feature screens
│   │   └── widgets/           # AvatarBadge, BookingCard, WorkerCard, VspButton, etc.
│   └── main.dart              # Application entrypoint & dependency injection setup
└── test/                      # Unit and widget test suite
    ├── models_test.dart       # Serialization/deserialization tests
    ├── providers_test.dart    # State provider logic tests
    ├── widget_test.dart       # StatusPill & AvatarBadge rendering tests
    └── widgets_test.dart      # Reusable UI component interaction tests
```

---

## Design System & Typography

### Typography Scales
- **Display & Headings**: `GoogleFonts.nunito()` (Extra-bold / Black `w800`–`w900`) for high-contrast, friendly vocational branding.
- **Body & Captions**: `GoogleFonts.inter()` (`w400`–`w600`) for clean, highly legible transactional text.

### Brand Color Tokens
| Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| `AppColors.brand` | `#0EA5E9` | Vibrant Sky Blue — primary action buttons, active navigation, badges |
| `AppColors.accent` | `#F97316` | Warm Orange — tradesperson highlight, call-to-actions, rating stars |
| `AppColors.screenBg` | `#F8FAFC` | Light neutral slate screen background |
| `AppColors.cardBg` | `#FFFFFF` | Pure white container surfaces |
| `AppColors.darkText` | `#0F172A` | Primary text high-contrast slate |
| `AppColors.midText` | `#64748B` | Secondary captions, subheadings, labels |
| `AppColors.success` | `#10B981` | Completed jobs, active status pills |
| `AppColors.danger` | `#EF4444` | Cancellations, error indicators, alerts |

---

## Screen Catalog (41 Screens)

### 1. Authentication & Onboarding (5 Screens)
- `SplashScreen`: Animated logo reveal and automatic token verification.
- `OnboardingScreen`: 3-slide value proposition carousel with trade category highlights.
- `LoginScreen`: Dual email/phone login with quick-fill demo buttons for Alice (Customer) and Bob (Worker).
- `RegisterScreen`: Account registration with persona toggle (Customer vs Worker).
- `ForgotPasswordScreen`: Password recovery code request and reset workflow.

### 2. Customer Persona (18 Screens)
- `CustomerShell`: Bottom navigation scaffold with 5 persistent tabs.
- `HomeScreen`: Active booking hero card, quick-request CTA, trade category chips, and featured workers.
- `SearchScreen`: Full-text vocational trade search with category and distance filters.
- `FeedScreen`: Community social feed with worker project updates, before/after photos, likes, and comments.
- `PostDetailScreen`: Expanded post view with comments list and reply submission.
- `WorkerDetailScreen`: Comprehensive worker profile (rating, completed jobs, trade specialties, hourly rate, portfolio gallery, direct booking/chat buttons).
- `CreateServiceRequestScreen`: Multi-field service request form (title, trade category, description, scheduled date).
- `ServiceRequestsScreen`: Tabbed list of customer's active and historical service requests.
- `BookingsScreen`: Active, upcoming, and past booking list.
- `BookingDetailScreen`: Booking status lifecycle tracker, worker details, and completion receipt.
- `ReviewSubmissionScreen`: Star rating and feedback submission for completed services.
- `InboxScreen`: Active conversation threads list with unread counters and timestamps.
- `ChatConversationScreen`: Real-time WebSocket messaging screen with message bubbles and send action.
- `ProfileScreen`: Customer account details, active persona badge, settings navigation, and worker-mode switch.
- `EditProfileScreen`: First name, last name, phone, bio, and city editor.
- `SavedWorkersScreen`: Bookmarked tradespeople for quick repeat hiring.
- `NotificationsScreen`: Push notification inbox with deep links to bookings and messages.
- `SettingsScreen`: Account security, notifications preferences, password change, and logout.

### 3. Worker Persona (18 Screens)
- `WorkerShell`: Bottom navigation scaffold for tradespeople (`Dashboard`, `Requests`, `Bookings`, `Inbox`, `Profile`).
- `WorkerDashboardScreen`: Real-time earnings summary, active job count, rating score, and incoming job lead queue.
- `WorkerOnboardingWizardScreen`: Multi-step credentialing wizard (trades, service areas, licenses, rate card).
- `WorkerRequestsScreen`: Incoming marketplace request feed with quote submission actions.
- `RequestResponseScreen`: Price quote and proposed schedule submission form.
- `WorkerBookingsScreen`: Scheduled customer appointments with status update actions (`Start Job`, `Complete Job`).
- `WorkerReviewsScreen`: Customer reviews, ratings breakdown, and satisfaction metric history.
- `WorkerAnalyticsScreen`: Weekly/monthly revenue analytics, job completion rates, and client retention charts.
- `WorkerProfilePreviewScreen`: Public preview of how the worker's card appears to customers.

---

## State Management Providers

All application business logic is isolated in `ChangeNotifier` providers registered at root in `MultiProvider`:

| Provider | Purpose |
| :--- | :--- |
| `AuthProvider` | Manages JWT tokens, authentication status, persona switching (`customer` $\leftrightarrow$ `worker`), and login/register calls |
| `HomeProvider` | Loads active booking, available trade categories, and featured nearby workers |
| `SearchProvider` | Manages search query text, selected trade filters, and worker search results |
| `ServiceRequestProvider`| Handles creating service requests, loading quotes, and tracking status |
| `BookingProvider` | Manages active bookings list, booking status updates, and review submissions |
| `ChatProvider` | Handles WebSocket conversation threads, incoming message streams, and sending chats |
| `FeedProvider` | Loads community feed posts, handles likes, and comment submissions |
| `WorkerProvider` | Manages worker dashboard metrics, incoming leads, and analytics |
| `NotificationsProvider` | Manages notification list and mark-as-read states |

---

## Network & Real-Time Gateway

### Base URL Resolution
The application automatically selects the appropriate base URL:
- **Physical Device (via ADB Reverse)**: `http://127.0.0.1:3000/api/v1` and `ws://127.0.0.1:3002/ws`
- **Web / Desktop**: `http://localhost:3000/api/v1` and `ws://localhost:3002/ws`

### Token Lifecycle
1. Access token (15-minute RSA-256 JWT) and Refresh token are saved securely upon login via `StorageService`.
2. All outgoing authenticated requests include `Authorization: Bearer <accessToken>`.
3. In-flight token expiration triggers automatic refresh using `/api/v1/auth/refresh`.

---

## Offline Resilience & Device Adaptation

- **Offline Font Fetching**:
  `GoogleFonts.config.allowRuntimeFetching = false;` is configured in `main.dart`. If the device has no external Internet connection, the application falls back gracefully to system fonts without throwing unhandled network exceptions.
- **Dynamic Route Aliases**:
  `GoRouter` contains convenience redirects for common shorthand paths (e.g. `/home` $\to$ `/customer/home`, `/worker` $\to$ `/worker/dashboard`, `/bookings`, `/create-request`), ensuring deep links and notification taps resolve cleanly.

---

## Testing & Quality Verification

### Run Static Analysis
```bash
flutter analyze
# Expected: No issues found!
```

### Run Unit and Widget Tests
```bash
flutter test
# Expected: All 12 tests passed!
```

---

## Physical Android Device Deployment (ADB Reverse)

### Step 1: Connect Device & Forward Ports
```bash
adb devices -l
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3002 tcp:3002
```

### Step 2: Build & Run
```bash
# Debug build and install
flutter build apk --debug
adb install -r build/app/outputs/flutter-apk/app-debug.apk

# Launch app on device
adb shell am start -n com.vsp.vsp_mobile/.MainActivity
```
