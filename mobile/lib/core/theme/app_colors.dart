import 'package:flutter/material.dart';

/// VSP Mobile Design System Color Tokens
/// Directly maps to VSP_Mobile_Frontend_Design_System.html
class AppColors {
  AppColors._();

  // Brand Sky Blue Palette
  static const Color brand = Color(0xFF0EA5E9);
  static const Color brandDark = Color(0xFF0284C7);
  static const Color brandLight = Color(0xFFE0F2FE);

  // Accent Warm Orange
  static const Color accent = Color(0xFFF97316);
  static const Color accentLight = Color(0xFFFFF7ED);
  static const Color accentDark = Color(0xFFEA580C);

  // Backgrounds & Surfaces
  static const Color screenBg = Color(0xFFF0F9FF);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color cardBgDark = Color(0xFF1E293B);

  // Slate Neutral Typography
  static const Color darkText = Color(0xFF0F172A);
  static const Color dark2 = Color(0xFF1E293B);
  static const Color dark3 = Color(0xFF334155);
  static const Color midText = Color(0xFF64748B);
  static const Color lightText = Color(0xFF94A3B8);
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFF1F5F9);

  // Functional States
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);
  static const Color successDark = Color(0xFF065F46);

  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color warningDark = Color(0xFF92400E);

  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFFFEE2E2);
  static const Color dangerDark = Color(0xFF991B1B);

  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

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
    colors: [Color(0xFF0EA5E9), Color(0xFF0284C7)],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0EA5E9), Color(0xFF6366F1)],
  );

  static const LinearGradient avatarGradient1 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0EA5E9), Color(0xFF8B5CF6)],
  );

  static const LinearGradient avatarGradient2 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF10B981), Color(0xFF059669)],
  );

  static const LinearGradient avatarGradient3 = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF97316), Color(0xFFDC2626)],
  );
}
