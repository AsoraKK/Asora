// ignore_for_file: public_member_api_docs

/// Lythaus Border Radius Tokens
///
/// Defines consistent border radius values for surfaces and components.
/// Uses a semantic naming approach (xs, sm, md, lg) mapped to pixel values.
library;

class LythRadius {
  /// 4 logical pixels (tight radius for small elements)
  static const double xs = 4;

  /// 8 logical pixels (standard radius for inputs, chips)
  static const double sm = 8;

  /// 12 logical pixels (medium radius for cards, dialogs)
  static const double md = 12;

  /// 16 logical pixels (large radius for elevated surfaces)
  static const double lg = 16;

  /// 24 logical pixels (extra large radius for prominent surfaces)
  static const double xl = 24;

  /// 32 logical pixels (pill-shaped buttons)
  static const double pill = 32;

  /// Full circle (used for avatar circles)
  static const double circle = 999;

  /// Standard card radius
  static const double card = md;

  /// Standard button radius
  static const double button = sm;

  /// Standard input field radius
  static const double input = sm;

  /// Standard dialog radius
  static const double dialog = lg;
}
