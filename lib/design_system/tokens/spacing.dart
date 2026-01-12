/// Lythaus Spacing Tokens
///
/// Defines consistent spacing scale used throughout the design system.
/// Built on an 8pt base unit for consistency.
library;

class LythSpacing {
  /// 4 logical pixels (half unit)
  static const double xs = 4;

  /// 8 logical pixels (1 unit)
  static const double sm = 8;

  /// 12 logical pixels (1.5 units)
  static const double md = 12;

  /// 16 logical pixels (2 units)
  static const double lg = 16;

  /// 20 logical pixels (2.5 units)
  static const double xl = 20;

  /// 24 logical pixels (3 units)
  static const double xxl = 24;

  /// 32 logical pixels (4 units)
  static const double xxxl = 32;

  /// 48 logical pixels (6 units)
  static const double huge = 48;

  /// Standard padding for cards
  static const double cardPadding = lg;

  /// Standard horizontal padding for screens
  static const double screenHorizontal = lg;

  /// Standard vertical padding for screens
  static const double screenVertical = lg;

  /// Gap between list items
  static const double listItemGap = md;

  /// Minimum tappable size (48×48 logical pixels)
  static const double minTapTarget = 48;
}
