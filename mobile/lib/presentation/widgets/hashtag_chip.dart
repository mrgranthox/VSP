import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';

class HashtagChip extends StatelessWidget {
  final String tag;
  final VoidCallback? onTap;
  final bool isSelected;
  final int? postCount;

  const HashtagChip({
    super.key,
    required this.tag,
    this.onTap,
    this.isSelected = false,
    this.postCount,
  });

  String get _cleanTag => tag.startsWith('#') ? tag.substring(1) : tag;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap ?? () => context.push('/hashtags/$_cleanTag'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.brand : AppColors.brandLight.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.brandDark : AppColors.brand.withValues(alpha: 0.25),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '#$_cleanTag',
              style: TextStyle(
                color: isSelected ? Colors.white : AppColors.brandDark,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            if (postCount != null) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white24 : AppColors.brand.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$postCount',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : AppColors.brandDark,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
