// ignore_for_file: public_member_api_docs

import 'package:flutter/material.dart';
import 'package:asora/design_system/theme/lyth_theme.dart';
import 'package:asora/ui/utils/motion.dart';

class AsoraTheme {
  static ThemeData light() {
    return LythausTheme.light().copyWith(
      pageTransitionsTheme: PageTransitionsTheme(
        builders: {
          for (final platform in TargetPlatform.values)
            platform: const _AsoraPageTransitionsBuilder(),
        },
      ),
    );
  }

  static ThemeData dark() {
    return LythausTheme.dark().copyWith(
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
