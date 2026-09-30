import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/network/api_client.dart';
import 'core/network/websocket_client.dart';
import 'core/storage/storage_service.dart';
import 'core/theme/app_theme.dart';

// Repositories
import 'data/repositories/auth_repository.dart';
import 'data/repositories/bookings_repository.dart';
import 'data/repositories/chat_repository.dart';
import 'data/repositories/discovery_repository.dart';
import 'data/repositories/notifications_repository.dart';
import 'data/repositories/requests_repository.dart';
import 'data/repositories/reviews_repository.dart';
import 'data/repositories/search_repository.dart';
import 'data/repositories/social_repository.dart';
import 'data/repositories/users_repository.dart';
import 'data/repositories/worker_repository.dart';
import 'data/repositories/linkedin_repository.dart';

// Providers
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/booking_provider.dart';
import 'presentation/providers/chat_provider.dart';
import 'presentation/providers/feed_provider.dart';
import 'presentation/providers/home_provider.dart';
import 'presentation/providers/linkedin_provider.dart';
import 'presentation/providers/notifications_provider.dart';
import 'presentation/providers/search_provider.dart';
import 'presentation/providers/service_request_provider.dart';
import 'presentation/providers/worker_provider.dart';

import 'package:google_fonts/google_fonts.dart';

import 'presentation/routes/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  // Initialize persistent storage (SharedPreferences)
  final storageService = await StorageService.init();

  // Initialize network clients
  final apiClient = ApiClient(storage: storageService);
  final wsClient = WebSocketClient(storage: storageService);

  // Initialize domain repositories
  final authRepo = AuthRepository(apiClient: apiClient, storage: storageService);
  final discoveryRepo = DiscoveryRepository(apiClient: apiClient);
  final searchRepo = SearchRepository(apiClient: apiClient);
  final requestsRepo = RequestsRepository(apiClient: apiClient);
  final bookingsRepo = BookingsRepository(apiClient: apiClient);
  final reviewsRepo = ReviewsRepository(apiClient: apiClient);
  final socialRepo = SocialRepository(apiClient: apiClient);
  final chatRepo = ChatRepository(
    apiClient: apiClient,
    wsClient: wsClient,
    storage: storageService,
  );
  final workerRepo = WorkerRepository(apiClient: apiClient);
  final notificationsRepo = NotificationsRepository(apiClient: apiClient);
  final usersRepo = UsersRepository(apiClient: apiClient);
  final linkedinRepo = LinkedInRepository(apiClient: apiClient);

  runApp(
    MultiProvider(
      providers: [
        // Repository providers for dependency injection
        Provider<StorageService>.value(value: storageService),
        Provider<ApiClient>.value(value: apiClient),
        Provider<WebSocketClient>.value(value: wsClient),
        Provider<AuthRepository>.value(value: authRepo),
        Provider<DiscoveryRepository>.value(value: discoveryRepo),
        Provider<SearchRepository>.value(value: searchRepo),
        Provider<RequestsRepository>.value(value: requestsRepo),
        Provider<BookingsRepository>.value(value: bookingsRepo),
        Provider<ReviewsRepository>.value(value: reviewsRepo),
        Provider<SocialRepository>.value(value: socialRepo),
        Provider<ChatRepository>.value(value: chatRepo),
        Provider<WorkerRepository>.value(value: workerRepo),
        Provider<NotificationsRepository>.value(value: notificationsRepo),
        Provider<UsersRepository>.value(value: usersRepo),
        Provider<LinkedInRepository>.value(value: linkedinRepo),

        // ChangeNotifier state providers
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            authRepository: authRepo,
            storage: storageService,
          ),
        ),
        ChangeNotifierProvider<HomeProvider>(
          create: (_) => HomeProvider(
            discoveryRepo: discoveryRepo,
            bookingsRepo: bookingsRepo,
          ),
        ),
        ChangeNotifierProvider<SearchProvider>(
          create: (_) => SearchProvider(
            searchRepo: searchRepo,
            discoveryRepo: discoveryRepo,
          ),
        ),
        ChangeNotifierProvider<FeedProvider>(
          create: (_) => FeedProvider(socialRepo: socialRepo),
        ),
        ChangeNotifierProvider<ChatProvider>(
          create: (_) => ChatProvider(
            chatRepo: chatRepo,
            wsClient: wsClient,
          ),
        ),
        ChangeNotifierProvider<BookingProvider>(
          create: (_) => BookingProvider(bookingsRepo: bookingsRepo),
        ),
        ChangeNotifierProvider<ServiceRequestProvider>(
          create: (_) => ServiceRequestProvider(requestsRepo: requestsRepo),
        ),
        ChangeNotifierProvider<WorkerProvider>(
          create: (_) => WorkerProvider(workerRepo: workerRepo),
        ),
        ChangeNotifierProvider<NotificationsProvider>(
          create: (_) => NotificationsProvider(repo: notificationsRepo),
        ),
        ChangeNotifierProvider<LinkedInProvider>(
          create: (_) => LinkedInProvider(repo: linkedinRepo),
        ),
      ],
      child: const VspApp(),
    ),
  );
}

class VspApp extends StatefulWidget {
  const VspApp({super.key});

  @override
  State<VspApp> createState() => _VspAppState();
}

class _VspAppState extends State<VspApp> {
  GoRouter? _router;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final authProvider = context.read<AuthProvider>();
    _router ??= AppRouter.createRouter(authProvider);
  }

  @override
  Widget build(BuildContext context) {
    if (_router == null) {
      return const SizedBox.shrink();
    }

    return MaterialApp.router(
      title: 'VSP - Vocational Services Platform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: _router!,
    );
  }
}
