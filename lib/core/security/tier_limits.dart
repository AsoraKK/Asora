class TierLimits {
  final int maxChars;
  final int maxMedia;
  final int postsPerHour;
  const TierLimits(this.maxChars, this.maxMedia, this.postsPerHour);
}

const Map<String, TierLimits> kTierLimits = {
  'free': TierLimits(500, 1, 5),
  'pro': TierLimits(2000, 4, 20),
  'admin': TierLimits(5000, 10, 100),
  'dev': TierLimits(5000, 10, 100),
};

TierLimits tierLimits(String tier) => kTierLimits[tier] ?? kTierLimits['free']!;

bool canPostContent(String tier, int contentLength, int mediaCount) {
  final limits = tierLimits(tier);
  return contentLength <= limits.maxChars && mediaCount <= limits.maxMedia;
}
