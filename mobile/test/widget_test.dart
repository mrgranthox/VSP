import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vsp_mobile/presentation/widgets/avatar_badge.dart';
import 'package:vsp_mobile/presentation/widgets/status_pill.dart';

void main() {
  group('VSP UI Core Components', () {
    testWidgets('StatusPill renders label correctly for CONFIRMED status',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: StatusPill(status: 'CONFIRMED'),
          ),
        ),
      );

      expect(find.text('CONFIRMED'), findsOneWidget);
    });

    testWidgets('AvatarBadge renders initials fallback when no imageUrl provided',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: AvatarBadge(name: 'Kwame Mensah', radius: 24),
          ),
        ),
      );

      expect(find.text('KM'), findsOneWidget);
    });
  });
}
