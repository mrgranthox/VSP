import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class DegreeChip extends StatelessWidget {
  final int degree; // 1, 2, 3 (for 3rd+)

  const DegreeChip({
    super.key,
    required this.degree,
  });

  @override
  Widget build(BuildContext context) {
    if (degree <= 0) return const SizedBox.shrink();

    final label = degree == 1
        ? '1st'
        : degree == 2
            ? '2nd'
            : '3rd+';

    final is1st = degree == 1;
    final is2nd = degree == 2;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
      decoration: BoxDecoration(
        color: is1st ? AppColors.brandLight : (is2nd ? Colors.white : AppColors.screenBg),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: is1st
              ? AppColors.brand
              : (is2nd ? AppColors.brandDark.withValues(alpha: 0.6) : AppColors.border),
          width: 0.8,
        ),
      ),
      child: Text(
        '• $label',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: is1st ? AppColors.brandDark : (is2nd ? AppColors.brandDark : AppColors.midText),
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
