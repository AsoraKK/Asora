// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:asora/ui/utils/motion.dart';
import 'package:asora/ui/theme/spacing.dart';

class AsoraTheme {
  static const Color _ink = Color(0xFF0F1720);
  static const Color _surface = Color(0xFFF7F9FC);
  static const Color _midnight = Color(0xFF0B1220);
  static const Color _teal = Color(0xFF1CA3A3);
  static const Color _amber = Color(0xFFFFB547);

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _teal,
      brightness: Brightness.light,
      primary: _teal,
      onPrimary: Colors.white,
      surface: _surface,
      onSurface: _ink,
      secondary: _amber,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _surface,
      textTheme: GoogleFonts.manropeTextTheme().apply(
        bodyColor: _ink,
        displayColor: _ink,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.manrope(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
          fontSize: 18,
        ),
        toolbarHeight: 48,
        iconTheme: IconThemeData(
          color: colorScheme.onSurface.withValues(alpha: 0.82),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: Colors.white,
      ),
      chipTheme: ChipThemeData(
        padding: const EdgeInsets.symmetric(
          horizontal: Spacing.xs,
          vertical: Spacing.xxxs,
        ),
        labelStyle: GoogleFonts.manrope(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: _ink,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: _ink.withValues(alpha: 0.08)),
        backgroundColor: colorScheme.surface,
      ),
      dividerColor: _ink.withValues(alpha: 0.06),
      listTileTheme: const ListTileThemeData(
        dense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: Spacing.md),
      ),
      pageTransitionsTheme: PageTransitionsTheme(
        builders: {
          for (final platform in TargetPlatform.values)
            platform: const _AsoraPageTransitionsBuilder(),
        },
      ),
    );
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _teal,
      brightness: Brightness.dark,
      primary: _teal,
      onPrimary: Colors.white,
      surface: _midnight,
      onSurface: Colors.white,
      secondary: _amber,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _midnight,
      textTheme: GoogleFonts.manropeTextTheme().apply(
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.manrope(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
          fontSize: 18,
        ),
        toolbarHeight: 48,
        iconTheme: IconThemeData(color: Colors.white.withValues(alpha: 0.9)),
      ),
      cardTheme: CardThemeData(
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: const Color(0xFF111827),
      ),
      chipTheme: ChipThemeData(
        padding: const EdgeInsets.symmetric(
          horizontal: Spacing.xs,
          vertical: Spacing.xxxs,
        ),
        labelStyle: GoogleFonts.manrope(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        backgroundColor: const Color(0xFF0D1726),
      ),
      dividerColor: Colors.white.withValues(alpha: 0.06),
      listTileTheme: const ListTileThemeData(
        dense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: Spacing.md),
      ),
      pageTransitionsTheme: PageTransitionsTheme(
        builders: {
          for (final platform in TargetPlatform.values)
            platform: const _AsoraPageTransitionsBuilder(),
        },
      ),
    );
  }
}

class _AsoraPageTransitionsBuilder extends PageTransitionsBuilder {
  const _AsoraPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    const curve = Curves.easeOutExpo;
    final tween = Tween(
      begin: const Offset(0, 0.04),
      end: Offset.zero,
    ).chain(CurveTween(curve: curve));
    final fade = Tween(
      begin: 0.92,
      end: 1.0,
    ).chain(CurveTween(curve: emphasizedDecelerate));

    return SlideTransition(
      position: animation.drive(tween),
      child: FadeTransition(opacity: animation.drive(fade), child: child),
    );
  }
}
