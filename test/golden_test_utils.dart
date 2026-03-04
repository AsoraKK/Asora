// Golden test utilities - font loading and deterministic rendering for visual testing
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

/// Standard surface size for golden tests - ensures consistent rendering across environments
const Size kGoldenTestSurfaceSize = Size(400, 300);

/// Configures fonts and rendering for deterministic golden tests.
///
/// Must be called in setUpAll() before any golden tests run.
/// This ensures consistent font rendering across local and CI environments by:
/// 1. Disabling runtime font fetching (ensures bundled fonts are used)
/// 2. Loading bundled Manrope font files into the test framework
/// 3. Setting up deterministic text rendering
Future<void> loadFontsForGoldenTests() async {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Disable Google Fonts network fetching - forces use of bundled asset fonts
  GoogleFonts.config.allowRuntimeFetching = false;

  // Load bundled Manrope font family for consistent rendering
  final fontLoader = FontLoader('Manrope');
  final fontWeights = ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'];

  for (final weight in fontWeights) {
    final fontData = await rootBundle.load('assets/fonts/Manrope-$weight.ttf');
    fontLoader.addFont(Future.value(fontData));
  }
  await fontLoader.load();

  // Also load as the default Material font for Flutter's text rendering
  final robotoLoader = FontLoader('Roboto');
  // Use Manrope-Regular as fallback for Roboto to ensure consistency
  final robotoData = await rootBundle.load('assets/fonts/Manrope-Regular.ttf');
  robotoLoader.addFont(Future.value(robotoData));
  await robotoLoader.load();
}

/// Wraps a widget with deterministic rendering settings for golden tests.
///
/// Use this in golden tests to ensure:
/// - Fixed device pixel ratio (1.0)
/// - Fixed text scale factor (1.0)
/// - Consistent platform brightness
/// - Fixed surface size
Widget goldenTestWrapper({
  required Widget child,
  ThemeData? theme,
  Size surfaceSize = kGoldenTestSurfaceSize,
}) {
  return MediaQuery(
    data: const MediaQueryData(
      size: kGoldenTestSurfaceSize,
      devicePixelRatio: 1.0,
      textScaler: TextScaler.noScaling,
      platformBrightness: Brightness.light,
    ),
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: Scaffold(body: Center(child: child)),
    ),
  );
}

/// Pumps a golden test widget with deterministic settings.
///
/// This is the recommended way to set up widgets for golden testing.
/// It ensures:
/// - Consistent surface size across platforms
/// - Fixed DPR and text scaling
/// - Proper font loading
Future<void> pumpGoldenWidget(
  WidgetTester tester, {
  required Widget child,
  ThemeData? theme,
  Size surfaceSize = kGoldenTestSurfaceSize,
}) async {
  // Set a fixed surface size for deterministic rendering
  await tester.binding.setSurfaceSize(surfaceSize);

  await tester.pumpWidget(
    MediaQuery(
      data: MediaQueryData(
        size: surfaceSize,
        devicePixelRatio: 1.0,
        textScaler: TextScaler.noScaling,
        platformBrightness: theme?.brightness == Brightness.dark
            ? Brightness.dark
            : Brightness.light,
      ),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        home: Scaffold(
          backgroundColor: theme?.colorScheme.surface,
          body: Center(child: child),
        ),
      ),
    ),
  );

  // Allow time for fonts and images to load
  await tester.pump(const Duration(milliseconds: 100));
}

/// Resets the surface size after golden tests.
///
/// Call this in tearDown or tearDownAll to restore default behavior.
Future<void> resetGoldenTestSurface(WidgetTester tester) async {
  await tester.binding.setSurfaceSize(null);
}
