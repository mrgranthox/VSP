import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/repositories/auth_repository.dart';
import 'package:vsp_mobile/data/repositories/linkedin_repository.dart';
import 'package:vsp_mobile/presentation/providers/auth_provider.dart';
import 'package:vsp_mobile/presentation/providers/linkedin_provider.dart';
import 'package:vsp_mobile/presentation/routes/app_router.dart';
import 'package:vsp_mobile/presentation/screens/customer/application_tracker_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/poll_creator_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/report_content_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/create_event_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/followers_following_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/block_list_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/data_privacy_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/group_messaging_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/skill_assessment_screen.dart';
import 'package:vsp_mobile/presentation/screens/customer/video_call_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Widget wrapWithTheme(Widget child, {LinkedInProvider? linkedin}) {
    if (linkedin != null) {
      return ChangeNotifierProvider<LinkedInProvider>.value(
        value: linkedin,
        child: MaterialApp(home: child),
      );
    }
    return MaterialApp(home: child);
  }

  group('Sprint D: 15 Missing Mobile Screens Tests', () {
    testWidgets('ApplicationTrackerScreen renders tabs and cards', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const ApplicationTrackerScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Job Application Tracker'), findsOneWidget);
      expect(find.textContaining('All ('), findsOneWidget);
      expect(find.textContaining('Active ('), findsOneWidget);
      expect(find.textContaining('Commercial Journeyman Electrician'), findsOneWidget);
      expect(find.textContaining('Apex Power & Automation'), findsOneWidget);
    });

    testWidgets('PollCreatorScreen renders and allows adding options', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const PollCreatorScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Create a Poll'), findsOneWidget);
      expect(find.text('Your Question'), findsOneWidget);
      expect(find.text('+ Add Option (max 4)'), findsOneWidget);

      await tester.tap(find.text('+ Add Option (max 4)'));
      await tester.pumpAndSettle();

      expect(find.text('Option 3'), findsOneWidget);
    });

    testWidgets('ReportContentScreen renders report reasons', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const ReportContentScreen(
        entityType: 'post',
        entityId: 'post-123',
      )));
      await tester.pumpAndSettle();

      expect(find.text('Report POST'), findsOneWidget);
      expect(find.text('Spam or unsolicited promotion'), findsOneWidget);
      expect(find.text('Submit Report'), findsOneWidget);
    });

    testWidgets('CreateEventScreen renders event format and fields', (tester) async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = LinkedInRepository(apiClient: apiClient);
      final linkedin = LinkedInProvider(repo: repo);

      await tester.pumpWidget(wrapWithTheme(const CreateEventScreen(), linkedin: linkedin));
      await tester.pumpAndSettle();

      expect(find.text('Create Trade Event'), findsOneWidget);
      expect(find.text('Online / Webinar'), findsOneWidget);
      expect(find.text('In-Person Workshop'), findsOneWidget);
      expect(find.text('Publish'), findsOneWidget);
    });

    testWidgets('FollowersFollowingScreen renders tabs and follow buttons', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const FollowersFollowingScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Network Following'), findsOneWidget);
      expect(find.textContaining('Followers ('), findsOneWidget);
      expect(find.textContaining('Following ('), findsOneWidget);
      expect(find.text('Marcus Vance'), findsOneWidget);
    });

    testWidgets('BlockListScreen renders blocked users and unblock action', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const BlockListScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Blocked Accounts'), findsOneWidget);
      expect(find.text('Unverified Subcontractor Corp'), findsOneWidget);
      expect(find.text('Unblock'), findsWidgets);
    });

    testWidgets('DataPrivacyScreen renders visibility switches', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const DataPrivacyScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Data Privacy & Settings'), findsOneWidget);
      expect(find.text('Include in Recruiter & Contractor Search'), findsOneWidget);
      expect(find.text('PROFILE VISIBILITY'), findsOneWidget);
      expect(find.text('COMMUNICATIONS & MESSAGING'), findsOneWidget);
    });

    testWidgets('GroupMessagingScreen renders guild discussion room', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const GroupMessagingScreen(groupId: 'guild-1')));
      await tester.pumpAndSettle();

      expect(find.text('Industrial Electricians & Automation Guild'), findsOneWidget);
      expect(find.textContaining('GFCI requirements'), findsOneWidget);
      expect(find.text('Reply'), findsWidgets);
    });

    testWidgets('SkillAssessmentScreen renders question and options', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const SkillAssessmentScreen(skillId: 'nec-101')));
      await tester.pumpAndSettle();

      expect(find.textContaining('National Electrical Code'), findsOneWidget);
      expect(find.text('Question 1 of 5'), findsOneWidget);
      expect(find.text('Next Question'), findsOneWidget);
    });

    testWidgets('VideoCallScreen renders call controls', (tester) async {
      await tester.pumpWidget(wrapWithTheme(const VideoCallScreen(conversationId: 'conv-101')));
      await tester.pumpAndSettle();

      expect(find.text('Turner Construction Co.'), findsOneWidget);
      expect(find.text('End-to-End Encrypted'), findsOneWidget);
      expect(find.byIcon(Icons.call_end), findsOneWidget);
    });

    testWidgets('AppRouter registers and matches all Sprint D routes', (tester) async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final authRepo = AuthRepository(apiClient: apiClient, storage: storage);
      final authProvider = AuthProvider(authRepository: authRepo, storage: storage);

      final router = AppRouter.createRouter(authProvider);
      final routePaths = router.configuration.routes
          .whereType<GoRoute>()
          .map((r) => r.path)
          .toSet();

      expect(routePaths.contains('/customer/post/create'), isTrue);
      expect(routePaths.contains('/hashtags/:tag'), isTrue);
      expect(routePaths.contains('/customer/skills'), isTrue);
      expect(routePaths.contains('/customer/open-to-work'), isTrue);
      expect(routePaths.contains('/customer/applications'), isTrue);
      expect(routePaths.contains('/customer/poll/create'), isTrue);
      expect(routePaths.contains('/report/:entityType/:entityId'), isTrue);
      expect(routePaths.contains('/events/create'), isTrue);
      expect(routePaths.contains('/customer/followers'), isTrue);
      expect(routePaths.contains('/customer/blocked'), isTrue);
      expect(routePaths.contains('/customer/privacy'), isTrue);
      expect(routePaths.contains('/chat/group/:groupId'), isTrue);
      expect(routePaths.contains('/skills/:skillId/assessment'), isTrue);
      expect(routePaths.contains('/call/:conversationId'), isTrue);
    });
  });
}
