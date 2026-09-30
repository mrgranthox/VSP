import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class AvatarBadge extends StatelessWidget {
  final String? name;
  final String? imageUrl;
  final double size;
  final double? radius;
  final bool isOnline;
  final LinearGradient? gradient;

  const AvatarBadge({
    super.key,
    this.name,
    this.imageUrl,
    this.size = 48.0,
    this.radius,
    this.isOnline = false,
    this.gradient,
  });

  double get _effectiveSize => radius != null ? radius! * 2 : size;

  String get _initials {
    if (name == null || name!.trim().isEmpty) return 'V';
    final parts = name!.trim().split(' ');
    if (parts.length > 1) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: _effectiveSize,
          height: _effectiveSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: gradient ?? AppColors.brandGradient,
          ),
          child: Center(
            child: Text(
              _initials,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: _effectiveSize * 0.38,
              ),
            ),
          ),
        ),
        if (isOnline)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: _effectiveSize * 0.28,
              height: _effectiveSize * 0.28,
              decoration: BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}
