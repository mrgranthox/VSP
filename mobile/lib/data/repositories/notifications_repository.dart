import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationsRepository {
  final ApiClient _apiClient;

  NotificationsRepository({required this._apiClient});

  Future<List<VspNotification>> getNotifications({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        ApiConstants.notifications,
        queryParams: {'page': page, 'limit': limit},
      );

      final list = response.data;
      if (list != null && list.isNotEmpty) {
        return list
            .map((e) => VspNotification.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackNotifications;
  }

  Future<void> markAllAsRead() async {
    try {
      await _apiClient.post(ApiConstants.notificationsReadAll);
    } catch (_) {}
  }

  Future<void> markAsRead(String id) async {
    try {
      await _apiClient.post(ApiConstants.notificationRead(id));
    } catch (_) {}
  }

  static final List<VspNotification> _fallbackNotifications = [
    VspNotification(
      id: 'notif-1',
      title: 'Booking Confirmed',
      body: 'Bob Williams accepted your booking for tomorrow at 10:00 AM.',
      notificationType: 'BOOKING_CONFIRMED',
      channel: 'IN_APP',
      isRead: false,
      createdAt: DateTime.now().subtract(const Duration(minutes: 10)),
    ),
    VspNotification(
      id: 'notif-2',
      title: 'New Message from Ama Kojo',
      body: 'Can you provide the house address details?',
      notificationType: 'CHAT_MESSAGE',
      channel: 'IN_APP',
      isRead: true,
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
  ];
}
