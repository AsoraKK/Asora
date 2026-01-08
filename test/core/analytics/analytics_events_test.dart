import 'package:asora/core/analytics/analytics_events.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('analytics event names are accessible', () {
    expect(AnalyticsEvents.appStarted, 'app_started');
    expect(AnalyticsEvents.screenView, 'screen_view');
  });
}
