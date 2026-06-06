// ignore_for_file: public_member_api_docs

library;

import 'package:flutter/foundation.dart';

bool get isReleaseWebBuild => kIsWeb && kReleaseMode;

bool isPrivateOrLocalHost(String host) {
  final normalized = host.trim().toLowerCase();
  if (normalized.isEmpty) return true;
  if (normalized == 'localhost' || normalized == '::1') return true;
  if (normalized.endsWith('.local')) return true;

  if (normalized == '127.0.0.1' || normalized == '0.0.0.0') return true;

  final ipv4 = RegExp(r'^(\d+)\.(\d+)\.(\d+)\.(\d+)$');
  final match = ipv4.firstMatch(normalized);
  if (match == null) return false;

  final a = int.parse(match.group(1)!);
  final b = int.parse(match.group(2)!);

  if (a == 10) return true;
  if (a == 127) return true;
  if (a == 192 && b == 168) return true;
  if (a == 172 && b >= 16 && b <= 31) return true;
  return false;
}

Uri requirePublicHttpsOrigin(String name, String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    throw StateError('$name is required for release web builds.');
  }

  final uri = Uri.tryParse(trimmed);
  if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
    throw StateError('$name must be a public HTTPS origin.');
  }

  if (isPrivateOrLocalHost(uri.host)) {
    throw StateError('$name must not target localhost or a private host.');
  }

  return uri;
}
