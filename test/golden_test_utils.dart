// Golden test utilities - font loading for consistent visual testing
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

/// Configures fonts for golden tests.
///
/// Must be called in setUpAll() before any golden tests run.
/// This ensures consistent font rendering in CI by:
/// 1. Disabling runtime font fetching (ensures bundled fonts are used)
/// 2. The google_fonts package will automatically find matching fonts
///    in the assets/fonts/ folder (bundled Manrope-*.ttf files)
Future<void> loadFontsForGoldenTests() async {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Disable Google Fonts network fetching - forces use of bundled asset fonts
  GoogleFonts.config.allowRuntimeFetching = false;
}
