import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/repositories/bookings_repository.dart';
import 'package:vsp_mobile/data/repositories/discovery_repository.dart';
import 'package:vsp_mobile/data/repositories/requests_repository.dart';
import 'package:vsp_mobile/presentation/providers/home_provider.dart';
import 'package:vsp_mobile/presentation/providers/service_request_provider.dart';
import 'package:vsp_mobile/presentation/screens/customer/jobs_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/network_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/worker_detail_screen.dart';
import 'package:vsp_mobile/data/repositories/auth_repository.dart';
import 'package:vsp_mobile/presentation/providers/auth_provider.dart';
import 'package:vsp_mobile/presentation/widgets/easy_apply_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late StorageService storage;
  late ApiClient apiClient;
  late AuthRepository authRepo;
  late AuthProvider authProvider;
  late DiscoveryRepository discoveryRepo;
  late BookingsRepository bookingsRepo;
  late RequestsRepository requestsRepo;
  late HomeProvider homeProvider;
  late ServiceRequestProvider requestProvider;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    storage = await StorageService.init();
    apiClient = ApiClient(storage: storage);
    authRepo = AuthRepository(apiClient: apiClient, storage: storage);
    authProvider = AuthProvider(authRepository: authRepo, storage: storage);
    discoveryRepo = DiscoveryRepository(apiClient: apiClient);
    bookingsRepo = BookingsRepository(apiClient: apiClient);
    requestsRepo = RequestsRepository(apiClient: apiClient);
    homeProvider = HomeProvider(
      discoveryRepo: discoveryRepo,
      bookingsRepo: bookingsRepo,
    );
    requestProvider = ServiceRequestProvider(requestsRepo: requestsRepo);
    await homeProvider.loadHomeData();
    await requestProvider.loadRequests();
  });

  Widget wrapWithProviders(Widget child) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<HomeProvider>.value(value: homeProvider),
        ChangeNotifierProvider<ServiceRequestProvider>.value(value: requestProvider),
      ],
      child: MaterialApp(
        home: child,
      ),
    );
  }

  group('Sprint E: Profile, Network & Jobs Deep Upgrades Tests', () {
    testWidgets('EasyApplySheet renders and submits application', (tester) async {
      Map<String, dynamic>? submittedData;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EasyApplySheet(
              jobId: 'job-101',
              jobTitle: 'Commercial Generator Maintenance',
              companyOrPoster: 'Airport Residential Area',
              budget: 'GH₵ 850',
              onSubmit: (data) async {
                submittedData = data;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Easy Apply'), findsOneWidget);
      expect(find.text('Commercial Generator Maintenance'), findsOneWidget);
      expect(find.text('• GH₵ 850'), findsOneWidget);
      expect(find.text('1. Contact Information'), findsOneWidget);
      expect(find.text('2. Experience & Trade Qualifications'), findsOneWidget);
      expect(find.text('VSP_Trade_Profile_Resume.pdf'), findsOneWidget);
      expect(find.text('Submit Application'), findsOneWidget);

      // Tap Submit Application
      await tester.tap(find.text('Submit Application'));
      await tester.pumpAndSettle();

      expect(submittedData, isNotNull);
      expect(submittedData!['jobId'], 'job-101');
      expect(submittedData!['fullName'], 'Kwame Mensah');
      expect(submittedData!['experienceLevel'], '3-5 years');
    });

    testWidgets('JobsScreen renders skill match badges and Easy Apply button', (tester) async {
      await tester.pumpWidget(wrapWithProviders(const JobsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Recommended for you'), findsOneWidget);
      expect(find.text('My Jobs'), findsOneWidget);
      expect(find.text('Applied'), findsOneWidget);
      expect(find.text('Post a Job'), findsWidgets);

      // Verify skill match percentage chip
      expect(find.textContaining('skills match •'), findsWidgets);

      // Verify Easy Apply buttons are present on job cards
      expect(find.text('Easy Apply'), findsWidgets);
    });

    testWidgets('NetworkScreen renders stats ribbon and manages invitations', (tester) async {
      await tester.pumpWidget(wrapWithProviders(const NetworkScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Manage my network'), findsOneWidget);
      expect(find.text('Connections'), findsOneWidget);
      expect(find.text('Followers'), findsOneWidget);
      expect(find.text('Following'), findsOneWidget);
      expect(find.text('Pages & Groups'), findsOneWidget);
      expect(find.textContaining('Invitations (3)'), findsOneWidget);
      expect(find.text('Emmanuel Osei'), findsOneWidget);

      // Accept first invitation
      final acceptButtons = find.byTooltip('Accept');
      expect(acceptButtons, findsWidgets);
      await tester.tap(acceptButtons.first);
      await tester.pumpAndSettle();

      // Invitation count should decrease to 2
      expect(find.textContaining('Invitations (2)'), findsOneWidget);
      expect(find.text('Connected with Emmanuel Osei!'), findsOneWidget);

      // Ignore next invitation
      final ignoreButtons = find.byTooltip('Ignore');
      await tester.tap(ignoreButtons.first);
      await tester.pumpAndSettle();

      // Invitation count should decrease to 1
      expect(find.textContaining('Invitations (1)'), findsOneWidget);
    });

    testWidgets('WorkerDetailScreen renders 5 tabs, articles, and skill endorsements', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: WorkerDetailScreen(workerId: 'worker-1'),
        ),
      );
      await tester.pumpAndSettle();

      // Verify Tabs
      expect(find.text('About'), findsOneWidget);
      expect(find.text('Services'), findsOneWidget);
      expect(find.text('Portfolio'), findsOneWidget);
      expect(find.text('Articles'), findsOneWidget);
      expect(find.text('Reviews'), findsOneWidget);

      // Verify Skill Endorsements in About tab
      expect(find.text('Skills & Endorsements'), findsOneWidget);
      expect(find.text('Solar Inverter Maintenance'), findsOneWidget);

      // Tap on Endorse for Solar Inverter Maintenance
      final solarSkill = find.text('Solar Inverter Maintenance');
      expect(solarSkill, findsOneWidget);
      await tester.tap(solarSkill, warnIfMissed: false);
      await tester.pumpAndSettle();

      // Verify Tab switching to Articles tab
      await tester.tap(find.text('Articles'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Proper Surge Protection'), findsOneWidget);

      // Verify Tab switching to Portfolio tab
      await tester.tap(find.text('Portfolio'));
      await tester.pumpAndSettle();

      expect(find.text('Solar Inverter Setup'), findsOneWidget);
    });
  });
}
