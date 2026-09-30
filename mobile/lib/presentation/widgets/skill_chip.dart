import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class SkillChip extends StatelessWidget {
  final String name;
  final int endorsementsCount;
  final bool isEndorsedByMe;
  final bool isVerified;
  final VoidCallback? onEndorse;
  final VoidCallback? onTap;

  const SkillChip({
    super.key,
    required this.name,
    this.endorsementsCount = 0,
    this.isEndorsedByMe = false,
    this.isVerified = false,
    this.onEndorse,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final chipTapAction = onTap ?? onEndorse;

    return InkWell(
      onTap: chipTapAction != null
          ? () {
              HapticFeedback.lightImpact();
              chipTapAction();
            }
          : null,
      borderRadius: BorderRadius.circular(AppTheme.radiusFull),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isEndorsedByMe
              ? AppColors.brandLight
              : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          border: Border.all(
            color: isEndorsedByMe
                ? AppColors.brand
                : AppColors.border,
            width: isEndorsedByMe ? 1.5 : 1.0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 2,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isVerified) ...[
              const Icon(Icons.verified, size: 14, color: AppColors.brand),
              const SizedBox(width: 4),
            ],
            Text(
              name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isEndorsedByMe ? FontWeight.w700 : FontWeight.w600,
                color: isEndorsedByMe ? AppColors.brandDark : AppColors.darkText,
              ),
            ),
            if (endorsementsCount > 0 || onEndorse != null) ...[
              const SizedBox(width: 6),
              GestureDetector(
                onTap: onEndorse != null
                    ? () {
                        HapticFeedback.lightImpact();
                        onEndorse!();
                      }
                    : null,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: isEndorsedByMe ? AppColors.brand : AppColors.screenBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$endorsementsCount',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isEndorsedByMe ? Colors.white : AppColors.midText,
                    ),
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
