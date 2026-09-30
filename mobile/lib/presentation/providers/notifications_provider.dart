import 'package:flutter/material.dart';
import '../../data/models/notification_model.dart';
import '../../data/repositories/notifications_repository.dart';

class NotificationsProvider extends ChangeNotifier {
  final NotificationsRepository _repo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  List<VspNotification> _notifications = [];
  List<VspNotification> get notifications => _notifications;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  NotificationsProvider({required this._repo}) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      _notifications = await _repo.getNotifications();
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
      notifyListeners();
      await _repo.markAsRead(id);
    }
  }

  Future<void> markAllAsRead() async {
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    notifyListeners();
    await _repo.markAllAsRead();
  }
}
