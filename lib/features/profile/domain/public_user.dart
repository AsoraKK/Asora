// ignore_for_file: public_member_api_docs

import 'package:flutter/foundation.dart';

@immutable
class PublicUser {
  final String id;
  final String displayName;
  final String? handle;
  final String? avatarUrl;
  final String tier;
  final int reputationScore;
  final bool journalistVerified;
  final List<String> badges;

  const PublicUser({
    required this.id,
    required this.displayName,
    this.handle,
    this.avatarUrl,
    required this.tier,
    this.reputationScore = 0,
    this.journalistVerified = false,
    this.badges = const [],
  });

  /// Returns the preferred handle for display if available.
  String get handleLabel {
    final token = id.length >= 6 ? id.substring(0, 6) : id;
    return handle ?? '@$token';
  }

  factory PublicUser.fromJson(Map<String, dynamic> json) {
    return PublicUser(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      handle: json['handle'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      tier: json['tier'] as String? ?? 'free',
      reputationScore: (json['reputationScore'] as num?)?.toInt() ?? 0,
      journalistVerified: json['journalistVerified'] as bool? ?? false,
      badges:
          (json['badges'] as List<dynamic>?)?.whereType<String>().toList() ??
          const [],
    );
  }
}
