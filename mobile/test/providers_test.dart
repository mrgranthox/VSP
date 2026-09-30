import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/repositories/notifications_repository.dart';
import 'package:vsp_mobile/presentation/providers/notifications_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('VSP NotificationsProvider & NotificationsRepository Unit Tests', () {
    test('NotificationsProvider loads mock notifications in offline/mock mode', () async {
      final storage = await StorageService.init();
      final apiClient = ApiClient(storage: storage);
      final repo = NotificationsRepository(apiClient: apiClient);
      final provider = NotificationsProvider(repo: repo);

      // Load items
      await provider.loadNotifications();
      expect(provider.isLoading, isFalse);
      expect(provider.notifications.isNotEmpty, isTrue);

      final initialUnread = provider.unreadCount;
      expect(initialUnread, greaterThanOrEqualTo(0));

      // Mark first notification as read
      if (provider.notifications.isNotEmpty) {
        final firstId = provider.notifications.first.id;
        await provider.markAsRead(firstId);
        expect(provider.notifications.first.isRead, isTrue);
      }

      // Mark all as read
      await provider.markAllAsRead();
      expect(provider.unreadCount, 0);
      for (final notif in provider.notifications) {
        expect(notif.isRead, isTrue);
      }
    });
  });
}
