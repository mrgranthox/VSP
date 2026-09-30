import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../providers/notifications_provider.dart';
import '../../widgets/linkedin_post_creator.dart';

/// LinkedIn-style navigation shell:
/// 5 tabs: Home, My Network, Post (+), Notifications, Jobs
class CustomerShell extends StatelessWidget {
  final Widget child;

  const CustomerShell({
    super.key,
    required this.child,
  });

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/customer/home') ||
        location.startsWith('/customer/feed')) {
      return 0;
    }
    if (location.startsWith('/customer/network')) return 1;
    // index 2 is modal post action
    if (location.startsWith('/customer/notifications')) return 3;
    if (location.startsWith('/customer/jobs') ||
        location.startsWith('/customer/requests') ||
        location.startsWith('/customer/bookings')) {
      return 4;
    }
    if (location.startsWith('/customer/profile')) return 0;
    return 0;
  }

  void _onTap(int index, BuildContext context) {
    HapticFeedback.lightImpact();

    switch (index) {
      case 0:
        context.go('/customer/home');
        break;
      case 1:
        context.go('/customer/network');
        break;
      case 2:
        // Center (+) Post action opens the LinkedIn post creator sheet directly
        LinkedInPostCreatorSheet.show(context);
        break;
      case 3:
        context.go('/customer/notifications');
        break;
      case 4:
        context.go('/customer/jobs');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final unreadNotifs = context.watch<NotificationsProvider>().unreadCount;
    final currentIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: theme.cardTheme.color ?? Colors.white,
          border: Border(
            top: BorderSide(
              color: colorScheme.outlineVariant.withValues(alpha: 0.3),
              width: 1,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: currentIndex,
          onTap: (idx) => _onTap(idx, context),
          type: BottomNavigationBarType.fixed,
          backgroundColor: theme.cardTheme.color ?? Colors.white,
          elevation: 0,
          selectedItemColor: colorScheme.primary,
          unselectedItemColor: colorScheme.onSurfaceVariant,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.people_outline_rounded),
              activeIcon: Icon(Icons.people_rounded),
              label: 'My Network',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.add_box_outlined, size: 26),
              activeIcon: Icon(Icons.add_box_rounded, size: 26),
              label: 'Post',
            ),
            BottomNavigationBarItem(
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.notifications_none_rounded),
                  if (unreadNotifs > 0)
                    Positioned(
                      right: -4,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: AppColors.danger,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 14,
                          minHeight: 14,
                        ),
                        child: Text(
                          unreadNotifs > 9 ? '9+' : '$unreadNotifs',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              activeIcon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.notifications_rounded),
                  if (unreadNotifs > 0)
                    Positioned(
                      right: -4,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: AppColors.danger,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 14,
                          minHeight: 14,
                        ),
                        child: Text(
                          unreadNotifs > 9 ? '9+' : '$unreadNotifs',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              label: 'Notifications',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.work_outline_rounded),
              activeIcon: Icon(Icons.work_rounded),
              label: 'Jobs',
            ),
          ],
        ),
      ),
    );
  }
}
