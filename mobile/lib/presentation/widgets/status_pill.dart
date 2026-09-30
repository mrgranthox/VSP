import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class StatusPill extends StatelessWidget {
  final String status;

  const StatusPill({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label = status.replaceAll('_', ' ');

    switch (status.toUpperCase()) {
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'ACCEPTED':
      case 'ACTIVE':
        bg = AppColors.successLight;
        fg = AppColors.successDark;
        break;
      case 'IN_PROGRESS':
      case 'MATCHED':
      case 'SUBMITTED':
        bg = AppColors.brandLight;
        fg = AppColors.brandDark;
        break;
      case 'PENDING':
      case 'DRAFT':
        bg = AppColors.warningLight;
        fg = AppColors.warningDark;
        break;
      case 'CANCELLED':
      case 'DECLINED':
      case 'EXPIRED':
      case 'REJECTED':
        bg = AppColors.dangerLight;
        fg = AppColors.dangerDark;
        break;
      default:
        bg = AppColors.borderLight;
        fg = AppColors.midText;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
