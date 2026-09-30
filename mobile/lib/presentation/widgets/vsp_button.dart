import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

enum VspButtonVariant { primary, accent, outline, ghost, danger }

class VspButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final VspButtonVariant variant;
  final bool isLoading;
  final IconData? icon;
  final double? width;
  final double height;

  const VspButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = VspButtonVariant.primary,
    this.isLoading = false,
    this.icon,
    this.width,
    this.height = 48.0,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color fgColor;
    BorderSide? border;

    switch (variant) {
      case VspButtonVariant.primary:
        bgColor = AppColors.brand;
        fgColor = Colors.white;
        break;
      case VspButtonVariant.accent:
        bgColor = AppColors.accent;
        fgColor = Colors.white;
        break;
      case VspButtonVariant.outline:
        bgColor = Colors.transparent;
        fgColor = AppColors.brand;
        border = const BorderSide(color: AppColors.brand, width: 1.5);
        break;
      case VspButtonVariant.ghost:
        bgColor = Colors.transparent;
        fgColor = AppColors.dark3;
        break;
      case VspButtonVariant.danger:
        bgColor = AppColors.dangerLight;
        fgColor = AppColors.dangerDark;
        break;
    }

    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: bgColor,
      foregroundColor: fgColor,
      elevation: 0,
      side: border,
      disabledBackgroundColor: bgColor.withValues(alpha: 0.5),
      disabledForegroundColor: fgColor.withValues(alpha: 0.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radius),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
    );

    Widget content;
    if (isLoading) {
      content = SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(fgColor),
        ),
      );
    } else if (icon != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: fgColor),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: fgColor,
            ),
          ),
        ],
      );
    } else {
      content = Text(
        text,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: fgColor,
        ),
      );
    }

    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        style: buttonStyle,
        onPressed: isLoading ? null : onPressed,
        child: content,
      ),
    );
  }
}
