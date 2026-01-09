import 'package:asora/core/analytics/analytics_events.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AnalyticsEvents', () {
    test('analytics event names are accessible', () {
      expect(AnalyticsEvents.appStarted, 'app_started');
      expect(AnalyticsEvents.screenView, 'screen_view');
    });

    test('all authentication events are defined', () {
      expect(AnalyticsEvents.authStarted, isNotEmpty);
      expect(AnalyticsEvents.authCompleted, isNotEmpty);
      expect(AnalyticsEvents.authSignedOut, isNotEmpty);
    });

    test('all content creation events are defined', () {
      expect(AnalyticsEvents.postCreated, isNotEmpty);
      expect(AnalyticsEvents.commentCreated, isNotEmpty);
    });

    test('all engagement events are defined', () {
      expect(AnalyticsEvents.feedScrolled, isNotEmpty);
      expect(AnalyticsEvents.postInteraction, isNotEmpty);
    });

    test('all privacy events are defined', () {
      expect(AnalyticsEvents.privacySettingsOpened, isNotEmpty);
      expect(AnalyticsEvents.privacyExportRequested, isNotEmpty);
      expect(AnalyticsEvents.privacyDeleteRequested, isNotEmpty);
      expect(AnalyticsEvents.analyticsConsentChanged, isNotEmpty);
    });

    test('all moderation events are defined', () {
      expect(AnalyticsEvents.moderationAppealSubmitted, isNotEmpty);
      expect(AnalyticsEvents.moderationConsoleOpened, isNotEmpty);
      expect(AnalyticsEvents.moderationDecisionMade, isNotEmpty);
    });

    test('error event is defined', () {
      expect(AnalyticsEvents.errorEncountered, isNotEmpty);
    });

    test('event names follow naming convention', () {
      expect(AnalyticsEvents.appStarted, equals('app_started'));
      expect(AnalyticsEvents.screenView, equals('screen_view'));
      expect(AnalyticsEvents.authStarted, equals('auth_started'));
      expect(AnalyticsEvents.authCompleted, equals('auth_completed'));
      expect(AnalyticsEvents.authSignedOut, equals('auth_signed_out'));
      expect(AnalyticsEvents.postCreated, equals('post_created'));
      expect(AnalyticsEvents.commentCreated, equals('comment_created'));
    });

    test('all property key constants are defined', () {
      expect(AnalyticsEvents.propScreenName, isNotEmpty);
      expect(AnalyticsEvents.propReferrer, isNotEmpty);
      expect(AnalyticsEvents.propMethod, isNotEmpty);
      expect(AnalyticsEvents.propIsNewUser, isNotEmpty);
      expect(AnalyticsEvents.propMediaType, isNotEmpty);
      expect(AnalyticsEvents.propAiBlocked, isNotEmpty);
      expect(AnalyticsEvents.propIsFirstPost, isNotEmpty);
      expect(AnalyticsEvents.propApproxItemsViewed, isNotEmpty);
      expect(AnalyticsEvents.propSessionDurationSeconds, isNotEmpty);
      expect(AnalyticsEvents.propAction, isNotEmpty);
      expect(AnalyticsEvents.propEnabled, isNotEmpty);
      expect(AnalyticsEvents.propSource, isNotEmpty);
      expect(AnalyticsEvents.propAppealType, isNotEmpty);
      expect(AnalyticsEvents.propUrgencyScore, isNotEmpty);
      expect(AnalyticsEvents.propCaseType, isNotEmpty);
      expect(AnalyticsEvents.propErrorType, isNotEmpty);
      expect(AnalyticsEvents.propRecoverable, isNotEmpty);
    });
  });
}
