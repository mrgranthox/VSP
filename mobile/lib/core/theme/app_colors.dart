import 'package:flutter/material.dart';

/// VSP Mobile Design System Color Tokens
/// Provides accessible, high-contrast WCAG AA/AAA compliant color tokens.
class AppColors {
  AppColors._();

  // Brand Sky Blue Palette (Sky 600/700 for high-contrast interactive elements)
  static const Color brand = Color(0xFF0284C7);
  static const Color brandDark = Color(0xFF0369A1);
  static const Color brandLight = Color(0xFFE0F2FE);
  static const Color brand500 = Color(0xFF0EA5E9);

  // Accent Warm Orange Palette (Orange 600/700 for high-contrast interactive elements)
  static const Color accent = Color(0xFFEA580C);
  static const Color accentLight = Color(0xFFFFF7ED);
  static const Color accentDark = Color(0xFFC2410C);

  // Backgrounds & Surfaces
  static const Color screenBg = Color(0xFFF8FAFC);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color cardBgDark = Color(0xFF1E293B);

  // Slate Neutral Typography (Optimized for maximum readability)
  static const Color darkText = Color(0xFF0F172A);
  static const Color dark2 = Color(0xFF1E293B);
  static const Color dark3 = Color(0xFF334155);
  static const Color midText = Color(0xFF475569);
  static const Color lightText = Color(0xFF64748B);
  static const Color border = Color(0xFFCBD5E1);
  static const Color borderLight = Color(0xFFE2E8F0);

  // Functional States
  static const Color success = Color(0xFF059669);
  static const Color successLight = Color(0xFFECFDF5);
  static const Color successDark = Color(0xFF065F46);

  static const Color warning = Color(0xFFD97706);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color warningDark = Color(0xFF92400E);

  static const Color danger = Color(0xFFDC2626);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color dangerDark = Color(0xFF991B1B);

  static const Color info = Color(0xFF2563EB);
  static const Color infoLight = Color(0xFFEFF6FF);

  // Common Semantic Aliases matching Design System
  static const Color primary = brand;
  static const Color primaryDark = brandDark;
  static const Color primaryLight = brandLight;
  static const Color primarySurface = brandLight;

  static const Color secondary = accent;
  static const Color secondaryDark = accentDark;
  static const Color secondaryLight = accentLight;
  static const Color secondarySurface = accentLight;

  static const Color textPrimary = darkText;
  static const Color textSecondary = midText;
  static const Color textMuted = lightText;

  static const Color neutralBg = screenBg;
  static const Color error = danger;
  static const Color errorSurface = dangerLight;
  static const Color successSurface = successLight;
  static const Color warningSurface = warningLight;

  // Gradients
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0284C7), Color(0xFF0369A1)],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0284C7), Color(0xFF4F46E5)],
  );

  static const LinearGradient avatarGradient1 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0284C7), Color(0xFF7C3AED)],
  );

  static const LinearGradient avatarGradient2 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF059669), Color(0xFF047857)],
  );

  static const LinearGradient avatarGradient3 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEA580C), Color(0xFFDC2626)],
  );
}
