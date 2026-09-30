import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
    final theme = Theme.of(context);
    Color bgColor;
    Color fgColor;
    BorderSide? border;

    switch (variant) {
      case VspButtonVariant.primary:
        bgColor = theme.colorScheme.primary;
        fgColor = theme.colorScheme.onPrimary;
        break;
      case VspButtonVariant.accent:
        bgColor = theme.colorScheme.secondary;
        fgColor = theme.colorScheme.onSecondary;
        break;
      case VspButtonVariant.outline:
        bgColor = Colors.transparent;
        fgColor = theme.colorScheme.primary;
        border = BorderSide(color: theme.colorScheme.primary, width: 1.5);
        break;
      case VspButtonVariant.ghost:
        bgColor = Colors.transparent;
        fgColor = theme.colorScheme.onSurfaceVariant;
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
      splashFactory: InkSparkle.splashFactory,
      disabledBackgroundColor: bgColor.withValues(alpha: 0.5),
      disabledForegroundColor: fgColor.withValues(alpha: 0.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radius),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
    );

    final labelStyle = (theme.textTheme.labelLarge ?? const TextStyle()).copyWith(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: fgColor,
    );

    Widget content;
    if (isLoading) {
      content = SizedBox(
        key: const ValueKey('loading'),
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(fgColor),
        ),
      );
    } else if (icon != null) {
      content = Row(
        key: const ValueKey('icon_and_text'),
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: fgColor),
          const SizedBox(width: AppTheme.spacingXs),
          Text(text, style: labelStyle),
        ],
      );
    } else {
      content = Text(
        text,
        key: const ValueKey('text_only'),
        style: labelStyle,
      );
    }

    VoidCallback? effectiveOnPressed;
    if (onPressed != null && !isLoading) {
      effectiveOnPressed = () {
        HapticFeedback.lightImpact();
        onPressed!();
      };
    }

    return ConstrainedBox(
      constraints: const BoxConstraints(
        minHeight: 48.0,
        minWidth: 48.0,
      ),
      child: SizedBox(
        width: width,
        height: height,
        child: ElevatedButton(
          style: buttonStyle,
          onPressed: effectiveOnPressed,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            switchInCurve: Curves.easeOutBack,
            switchOutCurve: Curves.easeIn,
            child: content,
          ),
        ),
      ),
    );
  }
}
