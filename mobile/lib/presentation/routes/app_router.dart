import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

// Auth screens
import '../screens/auth/splash_screen.dart';
import '../screens/auth/onboarding_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';

// Customer screens
import '../screens/customer/customer_shell.dart';
import '../screens/customer/home_screen.dart';
import '../screens/customer/feed_screen.dart';
import '../screens/customer/search_screen.dart';
import '../screens/customer/inbox_screen.dart';
import '../screens/customer/profile_screen.dart';
import '../screens/customer/worker_detail_screen.dart';
import '../screens/customer/create_service_request_screen.dart';
import '../screens/customer/service_requests_screen.dart';
import '../screens/customer/bookings_screen.dart';
import '../screens/customer/booking_detail_screen.dart';
import '../screens/customer/review_submission_screen.dart';
import '../screens/customer/chat_conversation_screen.dart';
import '../screens/customer/saved_workers_screen.dart';
import '../screens/customer/notifications_screen.dart';
import '../screens/customer/post_detail_screen.dart';
import '../screens/customer/edit_profile_screen.dart';
import '../screens/customer/settings_screen.dart';

// Worker screens
import '../screens/worker/worker_shell.dart';
import '../screens/worker/worker_dashboard_screen.dart';
import '../screens/worker/worker_onboarding_wizard_screen.dart';
import '../screens/worker/worker_requests_screen.dart';
import '../screens/worker/request_response_screen.dart';
import '../screens/worker/worker_bookings_screen.dart';
import '../screens/worker/worker_reviews_screen.dart';
import '../screens/worker/worker_analytics_screen.dart';
import '../screens/worker/worker_profile_preview_screen.dart';

class AppRouter {
  static GoRouter createRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/splash',
      refreshListenable: authProvider,
      routes: [
        // ================= AUTH ROUTES =================
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        GoRoute(
          path: '/forgot-password',
          builder: (context, state) => const ForgotPasswordScreen(),
        ),
        GoRoute(
          path: '/home',
          redirect: (context, state) => '/customer/home',
        ),
        GoRoute(
          path: '/worker',
          redirect: (context, state) => '/worker/dashboard',
        ),
        GoRoute(
          path: '/bookings',
          redirect: (context, state) => '/customer/bookings',
        ),
        GoRoute(
          path: '/booking/:id',
          redirect: (context, state) => '/customer/bookings/${state.pathParameters['id']}',
        ),
        GoRoute(
          path: '/requests',
          redirect: (context, state) => '/customer/requests',
        ),
        GoRoute(
          path: '/create-request',
          redirect: (context, state) {
            final cat = state.uri.queryParameters['categoryId'];
            return cat != null ? '/customer/create-request?categoryId=$cat' : '/customer/create-request';
          },
        ),
        GoRoute(
          path: '/saved-workers',
          redirect: (context, state) => '/customer/saved-workers',
        ),
        GoRoute(
          path: '/notifications',
          redirect: (context, state) => '/customer/notifications',
        ),
        GoRoute(
          path: '/settings',
          redirect: (context, state) => '/customer/settings',
        ),
        GoRoute(
          path: '/edit-profile',
          redirect: (context, state) => '/customer/edit-profile',
        ),
        GoRoute(
          path: '/worker/:id',
          redirect: (context, state) => '/customer/workers/${state.pathParameters['id']}',
        ),
        GoRoute(
          path: '/book-worker/:id',
          redirect: (context, state) => '/customer/create-request?workerId=${state.pathParameters['id']}',
        ),
        GoRoute(
          path: '/chat/:id',
          redirect: (context, state) {
            final name = state.uri.queryParameters['name'];
            final base = '/customer/chat/${state.pathParameters['id']}';
            return name != null ? '$base?name=${Uri.encodeComponent(name)}' : base;
          },
        ),
        GoRoute(
          path: '/submit-review/:id',
          redirect: (context, state) => '/customer/bookings/${state.pathParameters['id']}/review',
        ),
        GoRoute(
          path: '/post/:id',
          redirect: (context, state) => '/customer/feed/${state.pathParameters['id']}',
        ),

        // ================= CUSTOMER SHELL ROUTES =================
        ShellRoute(
          builder: (context, state, child) => CustomerShell(child: child),
          routes: [
            GoRoute(
              path: '/customer/home',
              builder: (context, state) => const HomeScreen(),
            ),
            GoRoute(
              path: '/customer/feed',
              builder: (context, state) => const FeedScreen(),
            ),
            GoRoute(
              path: '/customer/search',
              builder: (context, state) {
                final categoryId = state.uri.queryParameters['categoryId'];
                return SearchScreen(initialCategoryId: categoryId);
              },
            ),
            GoRoute(
              path: '/customer/inbox',
              builder: (context, state) => const InboxScreen(),
            ),
            GoRoute(
              path: '/customer/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),

        // ================= CUSTOMER STACK ROUTES =================
        GoRoute(
          path: '/customer/feed/:postId',
          builder: (context, state) {
            final postId = state.pathParameters['postId'] ?? '';
            return PostDetailScreen(postId: postId);
          },
        ),
        GoRoute(
          path: '/customer/workers/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return WorkerDetailScreen(workerId: id);
          },
        ),
        GoRoute(
          path: '/customer/create-request',
          builder: (context, state) {
            final categoryId = state.uri.queryParameters['categoryId'];
            return CreateServiceRequestScreen(categoryId: categoryId);
          },
        ),
        GoRoute(
          path: '/customer/requests',
          builder: (context, state) => const ServiceRequestsScreen(),
        ),
        GoRoute(
          path: '/customer/bookings',
          builder: (context, state) => const BookingsScreen(),
        ),
        GoRoute(
          path: '/customer/bookings/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return BookingDetailScreen(bookingId: id);
          },
        ),
        GoRoute(
          path: '/customer/bookings/:id/review',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return ReviewSubmissionScreen(bookingId: id);
          },
        ),
        GoRoute(
          path: '/customer/chat/:conversationId',
          builder: (context, state) {
            final conversationId = state.pathParameters['conversationId'] ?? '';
            final otherUserName =
                state.uri.queryParameters['name'] ?? 'Professional';
            return ChatConversationScreen(
              conversationId: conversationId,
              participantName: otherUserName,
            );
          },
        ),
        GoRoute(
          path: '/customer/saved-workers',
          builder: (context, state) => const SavedWorkersScreen(),
        ),
        GoRoute(
          path: '/customer/notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
        GoRoute(
          path: '/customer/edit-profile',
          builder: (context, state) => const EditProfileScreen(),
        ),
        GoRoute(
          path: '/customer/settings',
          builder: (context, state) => const SettingsScreen(),
        ),

        // ================= WORKER SHELL ROUTES =================
        ShellRoute(
          builder: (context, state, child) => WorkerShell(child: child),
          routes: [
            GoRoute(
              path: '/worker/dashboard',
              builder: (context, state) => const WorkerDashboardScreen(),
            ),
            GoRoute(
              path: '/worker/requests',
              builder: (context, state) => const WorkerRequestsScreen(),
            ),
            GoRoute(
              path: '/worker/bookings',
              builder: (context, state) => const WorkerBookingsScreen(),
            ),
            GoRoute(
              path: '/worker/inbox',
              builder: (context, state) => const InboxScreen(),
            ),
            GoRoute(
              path: '/worker/profile',
              builder: (context, state) => const WorkerProfilePreviewScreen(),
            ),
          ],
        ),

        // ================= WORKER STACK ROUTES =================
        GoRoute(
          path: '/worker/onboarding',
          builder: (context, state) => const WorkerOnboardingWizardScreen(),
        ),
        GoRoute(
          path: '/worker/requests/:id/respond',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return RequestResponseScreen(requestId: id);
          },
        ),
        GoRoute(
          path: '/worker/reviews',
          builder: (context, state) => const WorkerReviewsScreen(),
        ),
        GoRoute(
          path: '/worker/analytics',
          builder: (context, state) => const WorkerAnalyticsScreen(),
        ),
      ],
      errorBuilder: (context, state) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Page not found: ${state.uri.toString()}'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/customer/home'),
                child: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
