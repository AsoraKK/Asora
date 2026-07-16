import 'package:flutter_web_plugins/url_strategy.dart';

/// Uses browser path URLs so direct GoRouter routes survive navigation.
void configureAppUrlStrategy() {
  usePathUrlStrategy();
}
