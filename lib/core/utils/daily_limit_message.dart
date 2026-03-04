/// Utilities for translating server-side daily-limit payloads into user-facing text.
String dailyLimitMessage({
  required Map<String, dynamic> payload,
  required String actionLabel,
  DateTime? now,
}) {
  final tier = payload['tier']?.toString().toUpperCase() ?? 'YOUR TIER';
  final limit = payload['limit']?.toString() ?? 'your limit';
  final nowUtc = (now ?? DateTime.now()).toUtc();
  final resetAtRaw = payload['resetAt'];
  final resetAt = resetAtRaw is String ? DateTime.tryParse(resetAtRaw) : null;
  final waitText = (resetAt != null)
      ? _formatRetryText(resetAt.toUtc().difference(nowUtc))
      : 'later';

  return 'You have reached your daily $actionLabel limit of $limit ($tier tier). Try again $waitText.';
}

String _formatRetryText(Duration difference) {
  if (difference > Duration.zero) {
    final hours = difference.inHours;
    final minutes = difference.inMinutes % 60;
    if (hours > 0) {
      return 'in ${hours}h ${minutes}m';
    }
    if (minutes > 0) {
      return 'in ${minutes}m';
    }
    final seconds = difference.inSeconds % 60;
    if (seconds > 0) {
      return 'in ${seconds}s';
    }
  }
  return 'later';
}
