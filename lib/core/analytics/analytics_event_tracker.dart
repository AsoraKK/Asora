// ignore_for_file: public_member_api_docs

/// ASORA ANALYTICS EVENT TRACKER
///
/// 🎯 Purpose: Ensure one-time analytics events per install or user
/// 🔐 Privacy: Stores minimal event flags in secure storage
library;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asora/core/analytics/analytics_client.dart';

class AnalyticsEventTracker {
  AnalyticsEventTracker({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<bool> logEventOnce(
    AnalyticsClient client,
    String eventName, {
    String? userId,
    Map<String, Object?>? properties,
  }) async {
    final key = _buildKey(eventName, userId: userId);
    final existing = await _storage.read(key: key);
    if (existing == '1') {
      return false;
    }
    await client.logEvent(eventName, properties: properties);
    await _storage.write(key: key, value: '1');
    return true;
  }

  Future<bool> wasLogged(String eventName, {String? userId}) async {
    final key = _buildKey(eventName, userId: userId);
    return (await _storage.read(key: key)) == '1';
  }

  String _buildKey(String eventName, {String? userId}) {
    final normalized = eventName.replaceAll(RegExp(r'[^a-z0-9_]+'), '_');
    if (userId == null || userId.isEmpty) {
      return 'analytics_event_$normalized';
    }
    return 'analytics_event_${normalized}_$userId';
  }
}
