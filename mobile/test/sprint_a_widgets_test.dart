import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vsp_mobile/presentation/widgets/degree_chip.dart';
import 'package:vsp_mobile/presentation/widgets/hashtag_chip.dart';
import 'package:vsp_mobile/presentation/widgets/mention_text.dart';
import 'package:vsp_mobile/presentation/widgets/open_to_work_frame.dart';
import 'package:vsp_mobile/presentation/widgets/poll_widget.dart';
import 'package:vsp_mobile/presentation/widgets/premium_badge.dart';
import 'package:vsp_mobile/presentation/widgets/profile_strength_meter.dart';
import 'package:vsp_mobile/presentation/widgets/reaction_count_row.dart';
import 'package:vsp_mobile/presentation/widgets/reaction_picker.dart';
import 'package:vsp_mobile/presentation/widgets/skill_chip.dart';

void main() {
  group('Sprint A: 18 Shared Widgets Tests', () {
    testWidgets('ReactionPicker renders all 6 reactions and triggers callback',
        (WidgetTester tester) async {
      String? selected;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ReactionPicker(
              onSelect: (type) => selected = type,
            ),
          ),
        ),
      );

      expect(find.text('👍'), findsOneWidget);
      expect(find.text('🎉'), findsOneWidget);
      expect(find.text('❤️'), findsOneWidget);
      expect(find.text('💡'), findsOneWidget);
      expect(find.text('🤝'), findsOneWidget);
      expect(find.text('😄'), findsOneWidget);

      await tester.tap(find.text('🎉'));
      expect(selected, 'CELEBRATE');
    });

    testWidgets('ReactionCountRow displays total count and active emoji',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ReactionCountRow(
              reactionCounts: {'LIKE': 45, 'CELEBRATE': 12},
              totalCount: 57,
            ),
          ),
        ),
      );

      expect(find.text('57'), findsOneWidget);
      expect(find.text('👍'), findsOneWidget);
    });

    testWidgets('DegreeChip renders 1st, 2nd, and 3rd+ labels correctly',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                DegreeChip(degree: 1),
                DegreeChip(degree: 2),
                DegreeChip(degree: 3),
              ],
            ),
          ),
        ),
      );

      expect(find.text('• 1st'), findsOneWidget);
      expect(find.text('• 2nd'), findsOneWidget);
      expect(find.text('• 3rd+'), findsOneWidget);
    });

    testWidgets('HashtagChip formats tag and shows post count',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: HashtagChip(
              tag: 'SolarGhana',
              postCount: 84,
            ),
          ),
        ),
      );

      expect(find.text('#SolarGhana'), findsOneWidget);
      expect(find.text('84'), findsOneWidget);
    });

    testWidgets('MentionText renders text with rich mentions',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MentionText(
              text: 'Check out @kwame on the new #SolarProject',
            ),
          ),
        ),
      );

      expect(find.byType(RichText), findsOneWidget);
    });

    testWidgets('PollWidget renders interactive voting and triggers onVote',
        (WidgetTester tester) async {
      String? votedOption;

      final poll = PollData(
        id: 'poll-1',
        question: 'Which inverter brand do you recommend for residential solar?',
        options: const [
          PollOptionData(id: 'opt-1', label: 'Victron MultiPlus', votesCount: 18, percentage: 60),
          PollOptionData(id: 'opt-2', label: 'Growatt SPF', votesCount: 12, percentage: 40),
        ],
        totalVotes: 30,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PollWidget(
              poll: poll,
              onVote: (id) => votedOption = id,
            ),
          ),
        ),
      );

      expect(find.text(poll.question), findsOneWidget);
      expect(find.text('Victron MultiPlus'), findsOneWidget);
      expect(find.text('Growatt SPF'), findsOneWidget);

      await tester.tap(find.text('Victron MultiPlus'));
      expect(votedOption, 'opt-1');
    });

    testWidgets('PremiumBadge and OpenToWorkFrame render wrappers',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                PremiumBadge(
                  isPremium: true,
                  showBadgeLabel: true,
                  child: CircleAvatar(child: Text('KM')),
                ),
                OpenToWorkFrame(
                  isOpenToWork: true,
                  child: CircleAvatar(child: Text('AS')),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('PRO'), findsOneWidget);
      expect(find.text('#OpenToWork'), findsOneWidget);
    });

    testWidgets('ProfileStrengthMeter displays score and stage',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: ProfileStrengthMeter(
              score: 85,
            ),
          ),
        ),
      );

      expect(find.text('85%'), findsOneWidget);
      expect(find.text('All-Star Professional'), findsOneWidget);
    });

    testWidgets('SkillChip triggers onEndorse and displays count',
        (WidgetTester tester) async {
      bool endorsed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SkillChip(
              name: 'Solar PV Installation',
              endorsementsCount: 15,
              isEndorsedByMe: false,
              isVerified: true,
              onEndorse: () => endorsed = true,
            ),
          ),
        ),
      );

      expect(find.text('Solar PV Installation'), findsOneWidget);
      expect(find.text('15'), findsOneWidget);

      await tester.tap(find.text('Solar PV Installation'));
      expect(endorsed, isTrue);
    });
  });
}
