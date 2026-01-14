// ignore_for_file: public_member_api_docs

/// Formatting helpers for privacy UI strings.
library;

String formatPrivacyCountdown(Duration duration) {
  final totalMinutes = duration.inMinutes <= 0 ? 0 : duration.inMinutes;
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}';
}

String formatPrivacyTimestamp(DateTime dateTime) {
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final local = dateTime.toLocal();
  final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
  final minute = local.minute.toString().padLeft(2, '0');
  final period = local.hour >= 12 ? 'PM' : 'AM';
  final month = monthNames[local.month - 1];
  return '$month ${local.day}, ${local.year} • $hour:$minute $period';
}
