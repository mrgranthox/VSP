import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class ProfileStrengthMeter extends StatelessWidget {
  final int score; // 0 to 100
  final VoidCallback? onTap;
  final String? nextStepNudge;

  const ProfileStrengthMeter({
    super.key,
    required this.score,
    this.onTap,
    this.nextStepNudge,
  });

  String get _stageLabel {
    if (score >= 80) return 'All-Star Professional';
    if (score >= 50) return 'Intermediate Profile';
    return 'Beginner Profile';
  }

  Color get _stageColor {
    if (score >= 80) return const Color(0xFF10B981);
    if (score >= 50) return AppColors.brand;
    return const Color(0xFFF59E0B);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 44,
                    height: 44,
                    child: CircularProgressIndicator(
                      value: (score / 100.0).clamp(0.0, 1.0),
                      strokeWidth: 4.5,
                      backgroundColor: AppColors.borderLight,
                      valueColor: AlwaysStoppedAnimation<Color>(_stageColor),
                    ),
                  ),
                  Text(
                    '$score%',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: _stageColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Profile Strength: ',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.midText,
                          ),
                        ),
                        Text(
                          _stageLabel,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: _stageColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      nextStepNudge ??
                          (score < 80
                              ? 'Add skills and certifications to get 3x more service requests.'
                              : 'Your profile is optimized for recruitment and client inquiries.'),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.darkText,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (score < 100 && onTap != null) ...[
            const SizedBox(height: 10),
            const Divider(height: 1),
            const SizedBox(height: 8),
            InkWell(
              onTap: onTap,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Complete your profile',
                    style: TextStyle(
                      color: AppColors.brand,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.brand),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
