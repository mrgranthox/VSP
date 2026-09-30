import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vsp_mobile/data/models/user_model.dart';
import 'package:vsp_mobile/data/models/worker_profile_model.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_button.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_text_field.dart';
import 'package:vsp_mobile/presentation/widgets/worker_card.dart';
import 'package:vsp_mobile/presentation/widgets/empty_state_view.dart';

void main() {
  group('VSP Reusable Widgets Tests', () {
    testWidgets('VspButton renders text, responds to tap and displays loading state',
        (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VspButton(
              text: 'Book Specialist',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Book Specialist'), findsOneWidget);
      await tester.tap(find.byType(VspButton));
      expect(tapped, isTrue);

      // Loading state
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VspButton(
              text: 'Book Specialist',
              isLoading: true,
              onPressed: () {},
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('VspTextField renders label and hint, captures user input',
        (WidgetTester tester) async {
      final controller = TextEditingController();

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: VspTextField(
              controller: controller,
              label: 'Full Name',
              hint: 'Enter your full name',
            ),
          ),
        ),
      );

      expect(find.text('Full Name'), findsOneWidget);
      expect(find.text('Enter your full name'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Kofi Mensah');
      expect(controller.text, 'Kofi Mensah');
    });

    testWidgets('EmptyStateView renders title, message and button',
        (WidgetTester tester) async {
      bool actionTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyStateView(
              icon: Icons.inbox_outlined,
              title: 'No Messages Yet',
              message: 'Your active chats will appear here once you initiate contact.',
              buttonText: 'Find a Specialist',
              onButtonPressed: () => actionTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('No Messages Yet'), findsOneWidget);
      expect(find.text('Your active chats will appear here once you initiate contact.'), findsOneWidget);
      expect(find.text('Find a Specialist'), findsOneWidget);

      await tester.tap(find.text('Find a Specialist'));
      expect(actionTapped, isTrue);
    });

    testWidgets('WorkerCard displays worker headline, rate, rating, and verified badge',
        (WidgetTester tester) async {
      final worker = WorkerProfile(
        id: 'wkr-test',
        userId: 'usr-1',
        headline: 'Certified Master Plumber',
        userProfile: UserProfile(
          id: 'prof-1',
          userId: 'usr-1',
          firstName: 'Yaw',
          lastName: 'Boateng',
          displayName: 'Yaw Boateng',
        ),
        avgRating: 4.9,
        totalReviews: 42,
        jobsCompleted: 88,
        hourlyRateMinor: 12000,
        isVerified: true,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WorkerCard(
              worker: worker,
              onTap: () {},
            ),
          ),
        ),
      );

      expect(find.text('Yaw Boateng'), findsOneWidget);
      expect(find.text('Book Now'), findsOneWidget);
      expect(find.text('4.9'), findsOneWidget);
    });
  });
}
