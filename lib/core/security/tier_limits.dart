// ignore_for_file: public_member_api_docs

class TierLimits {
  final int maxChars;
  final int maxMedia;
  final int postsPerHour;
  const TierLimits(this.maxChars, this.maxMedia, this.postsPerHour);
}

const Map<String, TierLimits> kTierLimits = {
  'free': TierLimits(500, 1, 5),
  'premium': TierLimits(2000, 2, 20),
  'black': TierLimits(5000, 5, 50),
  // Legacy alias retained for backwards compatibility.
  'pro': TierLimits(2000, 2, 20),
  'admin': TierLimits(5000, 10, 100),
  'dev': TierLimits(5000, 10, 100),
};

TierLimits tierLimits(String tier) => kTierLimits[tier] ?? kTierLimits['free']!;

bool canPostContent(String tier, int contentLength, int mediaCount) {
  final limits = tierLimits(tier);
  return contentLength <= limits.maxChars && mediaCount <= limits.maxMedia;
}
