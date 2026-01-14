// ignore_for_file: public_member_api_docs

/// Lythaus Motion Tokens
///
/// Defines animation durations and curves used throughout the design system.
/// All durations respect MediaQuery.disableAnimations and system reduce-motion settings.
library;

import 'package:flutter/material.dart';

class LythMotion {
  /// Very quick feedback animations (e.g., button press, icon state change)
  /// Duration: 100ms
  static const Duration quick = Duration(milliseconds: 100);

  /// Standard interactive animations (e.g., dialog open, menu slide)
  /// Duration: 200ms
  static const Duration standard = Duration(milliseconds: 200);

  /// Prominent transitions (e.g., page navigation, significant UI changes)
  /// Duration: 300ms
  static const Duration prominent = Duration(milliseconds: 300);

  /// Slow, subtle animations (e.g., wordmark glow pulse, loading states)
  /// Duration: 6–10 seconds (configured per animation)
  static const Duration slow = Duration(milliseconds: 6000);

  /// Wordmark glow pulse interval (3–5 minutes between pulses)
  /// Duration: 180–300 seconds
  static const Duration wordmarkPulseInterval = Duration(seconds: 240);

  /// Wordmark glow pulse duration
  static const Duration wordmarkPulseDuration = Duration(seconds: 8);

  /// Standard easing curve (used for most UI animations)
  /// Provides smooth, natural-feeling motion
  static const Curve standardCurve = Curves.easeInOutCubic;

  /// Entrance easing (elements appearing)
  static const Curve entranceCurve = Curves.easeOut;

  /// Exit easing (elements disappearing)
  static const Curve exitCurve = Curves.easeIn;

  /// Emphasis easing (calls attention to movement)
  static const Curve emphasisCurve = Curves.easeInOutQuad;
}
