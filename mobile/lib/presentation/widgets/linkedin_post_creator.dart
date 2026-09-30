import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import '../providers/feed_provider.dart';
import 'avatar_badge.dart';

/// LinkedIn-style full post creator bottom sheet
class LinkedInPostCreatorSheet extends StatefulWidget {
  const LinkedInPostCreatorSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const LinkedInPostCreatorSheet(),
    );
  }

  @override
  State<LinkedInPostCreatorSheet> createState() =>
      _LinkedInPostCreatorSheetState();
}

class _LinkedInPostCreatorSheetState extends State<LinkedInPostCreatorSheet> {
  final TextEditingController _controller = TextEditingController();
  bool _canPost = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _canPost) {
        setState(() => _canPost = hasText);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handlePost() async {
    if (!_canPost || _isSubmitting) return;

    HapticFeedback.lightImpact();
    setState(() => _isSubmitting = true);

    try {
      final feed = context.read<FeedProvider>();
      await feed.createPost(_controller.text.trim());
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.brand,
            content: Text('Post shared to the community!'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final auth = context.watch<AuthProvider>();
    final userName = auth.currentUser?.profile?.fullName ?? 'User';

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: BoxDecoration(
        color: theme.cardTheme.color ?? Colors.white,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: Column(
        children: [
          // Header Bar with Close & Post button
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppTheme.spacingMd,
              vertical: AppTheme.spacingSm,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
                Text(
                  'Share Post',
                  style: (theme.textTheme.titleMedium ?? const TextStyle())
                      .copyWith(fontWeight: FontWeight.w700),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        _canPost ? colorScheme.primary : colorScheme.surfaceContainer,
                    foregroundColor:
                        _canPost ? Colors.white : colorScheme.onSurfaceVariant,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 6,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                    ),
                  ),
                  onPressed: _canPost && !_isSubmitting ? _handlePost : null,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Post',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Author Identity & Audience Pill
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                AvatarBadge(name: userName, size: 48),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userName,
                      style: (theme.textTheme.titleSmall ?? const TextStyle())
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.3),
                        ),
                        borderRadius:
                            BorderRadius.circular(AppTheme.radiusFull),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.public,
                            size: 12,
                            color: colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Anyone',
                            style: (theme.textTheme.labelSmall ??
                                    const TextStyle())
                                .copyWith(
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.arrow_drop_down,
                            size: 14,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Main Post Text Area
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _controller,
                maxLines: null,
                keyboardType: TextInputType.multiline,
                style: (theme.textTheme.bodyLarge ?? const TextStyle()).copyWith(
                  color: colorScheme.onSurface,
                  fontSize: 16,
                  height: 1.5,
                ),
                decoration: InputDecoration(
                  hintText: 'What vocational project or update do you want to share?',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                    fontSize: 15,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  fillColor: Colors.transparent,
                ),
              ),
            ),
          ),

          // LinkedIn Media Attachment Bar
          Container(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: theme.cardTheme.color ?? Colors.white,
              border: Border(
                top: BorderSide(
                  color: colorScheme.outlineVariant.withValues(alpha: 0.3),
                ),
              ),
            ),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Add Photo',
                  icon: const Icon(Icons.image_outlined),
                  color: AppColors.info,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                IconButton(
                  tooltip: 'Add Video',
                  icon: const Icon(Icons.smart_display_outlined),
                  color: AppColors.success,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                IconButton(
                  tooltip: 'Add Document',
                  icon: const Icon(Icons.description_outlined),
                  color: AppColors.secondary,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                IconButton(
                  tooltip: 'Celebrate Milestone',
                  icon: const Icon(Icons.military_tech_outlined),
                  color: AppColors.accent,
                  onPressed: () {
                    HapticFeedback.lightImpact();
                  },
                ),
                const Spacer(),
                Text(
                  '${_controller.text.length}/3000',
                  style: (theme.textTheme.labelSmall ?? const TextStyle())
                      .copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
