import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static const double radiusSm = 8.0;
  static const double radius = 12.0;
  static const double radiusLg = 20.0;
  static const double radiusXl = 28.0;
  static const double radiusFull = 999.0;

  // 8-Point Grid Spacing Tokens
  static const double spacingXxs = 4.0;
  static const double spacingXs = 8.0;
  static const double spacingSm = 12.0;
  static const double spacingMd = 16.0;
  static const double spacingLg = 24.0;
  static const double spacingXl = 32.0;
  static const double spacingXxl = 48.0;

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.interTextTheme();
    final nunito = GoogleFonts.nunito();

    return ThemeData(
      useMaterial3: true,
      splashFactory: InkSparkle.splashFactory,
      scaffoldBackgroundColor: AppColors.screenBg,
      primaryColor: AppColors.brand,
      colorScheme: ColorScheme.light(
        primary: AppColors.brand,
        onPrimary: Colors.white,
        primaryContainer: AppColors.brandLight,
        onPrimaryContainer: AppColors.brandDark,
        secondary: AppColors.accent,
        onSecondary: Colors.white,
        secondaryContainer: AppColors.accentLight,
        onSecondaryContainer: AppColors.accentDark,
        surface: AppColors.cardBg,
        onSurface: AppColors.darkText,
        error: AppColors.danger,
        onError: Colors.white,
        outline: AppColors.border,
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: nunito.copyWith(
          fontSize: 32,
          fontWeight: FontWeight.w900,
          color: AppColors.darkText,
          letterSpacing: -1.0,
        ),
        displayMedium: nunito.copyWith(
          fontSize: 28,
          fontWeight: FontWeight.w900,
          color: AppColors.darkText,
          letterSpacing: -0.5,
        ),
        titleLarge: nunito.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: AppColors.darkText,
          letterSpacing: -0.3,
        ),
        titleMedium: nunito.copyWith(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: AppColors.darkText,
        ),
        titleSmall: nunito.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.darkText,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: AppColors.dark3,
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: AppColors.dark3,
          height: 1.5,
        ),
        bodySmall: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppColors.midText,
          height: 1.4,
        ),
        labelLarge: nunito.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: AppColors.darkText,
        ),
        labelMedium: nunito.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: AppColors.midText,
        ),
        labelSmall: nunito.copyWith(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: AppColors.lightText,
          letterSpacing: 0.5,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        titleTextStyle: nunito.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: AppColors.darkText,
        ),
        iconTheme: const IconThemeData(color: AppColors.dark2),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: AppColors.borderLight, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
          textStyle: nunito.copyWith(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.brand,
          side: const BorderSide(color: AppColors.brand, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
          textStyle: nunito.copyWith(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          color: AppColors.lightText,
        ),
        labelStyle: GoogleFonts.inter(
          fontSize: 14,
          color: AppColors.midText,
          fontWeight: FontWeight.w500,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.border, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.border, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.brand, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.danger, width: 2),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.brand,
        unselectedItemColor: AppColors.lightText,
        selectedLabelStyle: nunito.copyWith(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: nunito.copyWith(fontSize: 11, fontWeight: FontWeight.w600),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.borderLight,
        thickness: 1,
        space: 1,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: ZoomPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: ZoomPageTransitionsBuilder(),
        },
      ),
    );
  }

  static ThemeData get darkTheme {
    final baseTextTheme = GoogleFonts.interTextTheme();
    final nunito = GoogleFonts.nunito();

    return ThemeData(
      useMaterial3: true,
      splashFactory: InkSparkle.splashFactory,
      scaffoldBackgroundColor: const Color(0xFF0F172A),
      primaryColor: AppColors.brand,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.brand,
        onPrimary: Colors.white,
        primaryContainer: Color(0xFF0369A1),
        onPrimaryContainer: Colors.white,
        secondary: AppColors.accent,
        onSecondary: Colors.white,
        secondaryContainer: Color(0xFFC2410C),
        onSecondaryContainer: Colors.white,
        surface: AppColors.cardBgDark,
        onSurface: Color(0xFFF8FAFC),
        surfaceContainer: Color(0xFF1E293B),
        onSurfaceVariant: Color(0xFF94A3B8),
        outline: Color(0xFF334155),
        outlineVariant: Color(0xFF1E293B),
        error: AppColors.danger,
        onError: Colors.white,
      ),
      textTheme: baseTextTheme.copyWith(
        displayLarge: nunito.copyWith(
          fontSize: 32,
          fontWeight: FontWeight.w900,
          color: const Color(0xFFF8FAFC),
          letterSpacing: -1.0,
        ),
        displayMedium: nunito.copyWith(
          fontSize: 28,
          fontWeight: FontWeight.w900,
          color: const Color(0xFFF8FAFC),
          letterSpacing: -0.5,
        ),
        titleLarge: nunito.copyWith(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: const Color(0xFFF8FAFC),
          letterSpacing: -0.3,
        ),
        titleMedium: nunito.copyWith(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: const Color(0xFFF8FAFC),
        ),
        titleSmall: nunito.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: const Color(0xFFF8FAFC),
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: const Color(0xFFCBD5E1),
          height: 1.5,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: const Color(0xFFCBD5E1),
          height: 1.5,
        ),
        bodySmall: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: const Color(0xFF94A3B8),
          height: 1.4,
        ),
        labelLarge: nunito.copyWith(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: const Color(0xFFF8FAFC),
        ),
        labelMedium: nunito.copyWith(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF94A3B8),
        ),
        labelSmall: nunito.copyWith(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF64748B),
          letterSpacing: 0.5,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.cardBgDark,
        foregroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.2),
        titleTextStyle: nunito.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: const Color(0xFFF8FAFC),
        ),
        iconTheme: const IconThemeData(color: Color(0xFFF8FAFC)),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardBgDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: Color(0xFF334155), width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
          textStyle: nunito.copyWith(
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1E293B),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: GoogleFonts.inter(
          fontSize: 14,
          color: const Color(0xFF64748B),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: const BorderSide(color: AppColors.brand, width: 2),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.cardBgDark,
        selectedItemColor: AppColors.brand,
        unselectedItemColor: const Color(0xFF64748B),
        selectedLabelStyle: nunito.copyWith(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: nunito.copyWith(fontSize: 11, fontWeight: FontWeight.w600),
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      dividerTheme: const DividerThemeData(
        color: Color(0xFF334155),
        thickness: 1,
        space: 1,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: ZoomPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: ZoomPageTransitionsBuilder(),
        },
      ),
    );
  }
}
