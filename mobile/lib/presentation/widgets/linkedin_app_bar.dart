import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import 'avatar_badge.dart';

/// The iconic LinkedIn mobile top bar:
/// - User avatar on the left (tap to view profile)
/// - Clean search bar pill in the center (tap to search workers, jobs, skills)
/// - Chat / messaging icon on the right with unread count badge
class LinkedInAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String hintText;
  final VoidCallback? onSearchTap;

  const LinkedInAppBar({
    super.key,
    this.hintText = 'Search jobs, trades, skills...',
    this.onSearchTap,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56.0);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final auth = Provider.of<AuthProvider?>(context);
    final chat = Provider.of<ChatProvider?>(context);
    final unreadChats = chat?.totalUnreadCount ?? 0;
    final userName = auth?.currentUser?.profile?.fullName ?? 'User';

    return Container(
      color: theme.cardTheme.color ?? Colors.white,
      padding: const EdgeInsets.symmetric(
        horizontal: AppTheme.spacingMd,
        vertical: AppTheme.spacingXs,
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            // 1. Profile Avatar (Tapping navigates to profile)
            InkWell(
              onTap: () {
                HapticFeedback.lightImpact();
                context.go('/customer/profile');
              },
              borderRadius: BorderRadius.circular(AppTheme.radiusFull),
              child: AvatarBadge(
                name: userName,
                size: 34,
                gradient: AppColors.brandGradient,
              ),
            ),
            const SizedBox(width: AppTheme.spacingSm),

            // 2. Search Pill (LinkedIn Style)
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onSearchTap ??
                      () {
                        HapticFeedback.lightImpact();
                        context.push('/customer/search');
                      },
                  splashFactory: InkSparkle.splashFactory,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  child: Ink(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainer,
                      borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.15),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.search_rounded,
                          size: 18,
                          color: colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            hintText,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: (theme.textTheme.bodyMedium ??
                                    const TextStyle())
                                .copyWith(
                              fontSize: 13,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppTheme.spacingSm),

            // 3. Messages Button with Unread Badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  tooltip: 'Messaging',
                  icon: Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: colorScheme.onSurface,
                    size: 22,
                  ),
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    context.push('/customer/inbox');
                  },
                ),
                if (unreadChats > 0)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 1,
                      ),
                      decoration: const BoxDecoration(
                        color: AppColors.danger,
                        borderRadius: BorderRadius.all(Radius.circular(10)),
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        unreadChats > 99 ? '99+' : '$unreadChats',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
