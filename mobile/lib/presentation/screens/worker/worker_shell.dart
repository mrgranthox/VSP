import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';

class WorkerShell extends StatelessWidget {
  final Widget child;

  const WorkerShell({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/worker/dashboard')) return 0;
    if (location.startsWith('/worker/requests')) return 1;
    if (location.startsWith('/worker/bookings')) return 2;
    if (location.startsWith('/worker/inbox')) return 3;
    if (location.startsWith('/worker/profile')) return 4;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/worker/dashboard');
        break;
      case 1:
        context.go('/worker/requests');
        break;
      case 2:
        context.go('/worker/bookings');
        break;
      case 3:
        context.go('/worker/inbox');
        break;
      case 4:
        context.go('/worker/profile');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onItemTapped(index, context),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primarySurface,
        elevation: 8,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded, color: AppColors.primary),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon:
                Icon(Icons.assignment_rounded, color: AppColors.primary),
            label: 'Requests',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon:
                Icon(Icons.calendar_today_rounded, color: AppColors.primary),
            label: 'Bookings',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            selectedIcon:
                Icon(Icons.chat_bubble_rounded, color: AppColors.primary),
            label: 'Messages',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon:
                Icon(Icons.person_rounded, color: AppColors.primary),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
