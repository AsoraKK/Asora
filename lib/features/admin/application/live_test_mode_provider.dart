// ignore_for_file: public_member_api_docs

/// LYTHAUS LIVE TEST MODE PROVIDER
///
/// 🎯 Purpose: State management for Control Panel live test mode
/// 🏗️ Architecture: Application layer - provides test mode context
/// 🔧 Features: Toggle between mock preview and live API calls
/// 🛡️ Safety: Marks test data with isTestPost flag for isolation
/// 🔗 API: Provides headers for server-side test mode enforcement
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// HTTP Headers for test mode requests
class TestModeHeaders {
  static const String testMode = 'X-Test-Mode';
  static const String sessionId = 'X-Test-Session-Id';
  static const String sessionStarted = 'X-Test-Session-Started';
}

/// Live test mode configuration
class LiveTestModeState {
  /// Whether live test mode is enabled (uses real APIs)
  final bool isEnabled;

  /// Whether to mark posts as test posts for data isolation
  final bool markAsTestPosts;

  /// Whether to auto-cleanup test posts after session
  final bool autoCleanup;

  /// Session ID for grouping test data
  final String sessionId;

  /// Timestamp when the session started
  final DateTime sessionStarted;

  const LiveTestModeState({
    this.isEnabled = false,
    this.markAsTestPosts = true,
    this.autoCleanup = false,
    required this.sessionId,
    required this.sessionStarted,
  });

  LiveTestModeState copyWith({
    bool? isEnabled,
    bool? markAsTestPosts,
    bool? autoCleanup,
    String? sessionId,
    DateTime? sessionStarted,
  }) {
    return LiveTestModeState(
      isEnabled: isEnabled ?? this.isEnabled,
      markAsTestPosts: markAsTestPosts ?? this.markAsTestPosts,
      autoCleanup: autoCleanup ?? this.autoCleanup,
      sessionId: sessionId ?? this.sessionId,
      sessionStarted: sessionStarted ?? this.sessionStarted,
    );
  }

  /// Generate a new session ID for test isolation
  static String generateSessionId() =>
      'test_${DateTime.now().millisecondsSinceEpoch}';

  /// Get HTTP headers for API requests in test mode
  /// Returns empty map if test mode is disabled
  Map<String, String> getApiHeaders() {
    if (!isEnabled) return {};

    return {
      TestModeHeaders.testMode: 'true',
      TestModeHeaders.sessionId: sessionId,
      TestModeHeaders.sessionStarted: sessionStarted.millisecondsSinceEpoch
          .toString(),
    };
  }
}

/// Notifier for live test mode state
class LiveTestModeNotifier extends StateNotifier<LiveTestModeState> {
  LiveTestModeNotifier()
    : super(
        LiveTestModeState(
          sessionId: LiveTestModeState.generateSessionId(),
          sessionStarted: DateTime.now(),
        ),
      );

  /// Toggle live test mode on/off
  void toggle() {
    if (state.isEnabled) {
      // Turning off - could trigger cleanup if autoCleanup is enabled
      state = state.copyWith(isEnabled: false);
    } else {
      // Turning on - start new session
      state = state.copyWith(
        isEnabled: true,
        sessionId: LiveTestModeState.generateSessionId(),
        sessionStarted: DateTime.now(),
      );
    }
  }

  /// Enable live test mode
  void enable() {
    if (!state.isEnabled) {
      state = state.copyWith(
        isEnabled: true,
        sessionId: LiveTestModeState.generateSessionId(),
        sessionStarted: DateTime.now(),
      );
    }
  }

  /// Disable live test mode
  void disable() {
    state = state.copyWith(isEnabled: false);
  }

  /// Toggle test post marking
  void setMarkAsTestPosts(bool value) {
    state = state.copyWith(markAsTestPosts: value);
  }

  /// Toggle auto cleanup
  void setAutoCleanup(bool value) {
    state = state.copyWith(autoCleanup: value);
  }

  /// Start a new test session (generates new session ID)
  void startNewSession() {
    state = state.copyWith(
      sessionId: LiveTestModeState.generateSessionId(),
      sessionStarted: DateTime.now(),
    );
  }
}

/// Provider for live test mode state
final liveTestModeProvider =
    StateNotifierProvider<LiveTestModeNotifier, LiveTestModeState>(
      (ref) => LiveTestModeNotifier(),
    );

/// Convenience provider to check if live mode is enabled
final isLiveTestModeProvider = Provider<bool>((ref) {
  return ref.watch(liveTestModeProvider).isEnabled;
});

/// Provider for current test session ID
final testSessionIdProvider = Provider<String?>((ref) {
  final state = ref.watch(liveTestModeProvider);
  return state.isEnabled ? state.sessionId : null;
});
