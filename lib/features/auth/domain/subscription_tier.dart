// ignore_for_file: public_member_api_docs

// lib/features/auth/domain/subscription_tier.dart

/// Subscription tier for the Lythaus platform.
/// Replaces the legacy `UserTier` (bronze/silver/gold/platinum).
///
/// `UserTier` is kept for backward compatibility but is deprecated.
/// New code should use `SubscriptionTier`.
enum SubscriptionTier {
  guest('guest'),
  free('free'),
  premium('premium'),
  black('black');

  const SubscriptionTier(this.value);
  final String value;

  static SubscriptionTier fromString(String? input) {
    if (input == null) return SubscriptionTier.free;
    return SubscriptionTier.values.firstWhere(
      (t) => t.value == input.toLowerCase(),
      orElse: () => SubscriptionTier.free,
    );
  }
}
