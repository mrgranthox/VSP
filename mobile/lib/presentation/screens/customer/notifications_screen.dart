import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/data/models/notification_model.dart';
import 'package:vsp_mobile/presentation/providers/notifications_provider.dart';
import 'package:vsp_mobile/presentation/widgets/empty_state_view.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'ALL';

  @override
  Widget build(BuildContext context) {
    final notifProvider = context.watch<NotificationsProvider>();
    final allNotifications = notifProvider.notifications;

    final filtered = allNotifications.where((n) {
      if (_selectedFilter == 'ALL') return true;
      if (_selectedFilter == 'BOOKINGS') {
        return n.notificationType.startsWith('BOOKING');
      }
      if (_selectedFilter == 'MESSAGES') {
        return n.notificationType == 'CHAT_MESSAGE';
      }
      if (_selectedFilter == 'SYSTEM') {
        return !n.notificationType.startsWith('BOOKING') &&
            n.notificationType != 'CHAT_MESSAGE';
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (notifProvider.unreadCount > 0)
            TextButton(
              onPressed: () => notifProvider.markAllAsRead(),
              child: const Text(
                'Mark all read',
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('ALL', 'All'),
                const SizedBox(width: 8),
                _buildFilterChip('BOOKINGS', 'Bookings'),
                const SizedBox(width: 8),
                _buildFilterChip('MESSAGES', 'Messages'),
                const SizedBox(width: 8),
                _buildFilterChip('SYSTEM', 'System'),
              ],
            ),
          ),
          const Divider(height: 1),

          // Notifications List
          Expanded(
            child: notifProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? const EmptyStateView(
                        title: 'No Notifications',
                        subtitle:
                            'You are all caught up! New alerts about bookings and messages will appear here.',
                        icon: Icons.notifications_none_rounded,
                      )
                    : RefreshIndicator(
                        onRefresh: () => notifProvider.loadNotifications(),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) =>
                              const Divider(height: 1, indent: 72),
                          itemBuilder: (context, index) {
                            final notif = filtered[index];
                            return _buildNotificationTile(
                                context, notif, notifProvider);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _selectedFilter = filterKey);
      },
      selectedColor: AppColors.primary,
      backgroundColor: Colors.grey.shade100,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 13,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? AppColors.primary : Colors.grey.shade300,
        ),
      ),
    );
  }

  Widget _buildNotificationTile(
    BuildContext context,
    VspNotification notif,
    NotificationsProvider provider,
  ) {
    IconData icon;
    Color iconColor;
    Color iconBg;

    if (notif.notificationType.startsWith('BOOKING')) {
      icon = Icons.calendar_today_rounded;
      iconColor = AppColors.primary;
      iconBg = AppColors.primarySurface;
    } else if (notif.notificationType == 'CHAT_MESSAGE') {
      icon = Icons.chat_bubble_outline_rounded;
      iconColor = AppColors.success;
      iconBg = AppColors.successSurface;
    } else {
      icon = Icons.info_outline_rounded;
      iconColor = AppColors.warning;
      iconBg = AppColors.warningSurface;
    }

    return InkWell(
      onTap: () {
        if (!notif.isRead) {
          provider.markAsRead(notif.id);
        }
        if (notif.notificationType.startsWith('BOOKING')) {
          context.push('/customer/bookings');
        } else if (notif.notificationType == 'CHAT_MESSAGE') {
          context.push('/customer/inbox');
        }
      },
      child: Container(
        color: notif.isRead ? Colors.transparent : AppColors.primarySurface.withValues(alpha: 0.4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: iconBg,
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          notif.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: notif.isRead
                                ? FontWeight.w600
                                : FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        DateFormat.jm().format(notif.createdAt),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notif.body,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      height: 1.3,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (!notif.isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
