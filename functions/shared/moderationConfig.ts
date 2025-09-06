export interface ModerationThresholds {
  reject: number; // score >= reject => reject
  review: number; // score >= review && < reject => review, else allow
}

export interface ModerationProviderConfig {
  provider: 'hive' | 'acs';
  hive?: {
    thresholds: ModerationThresholds;
  };
  acs?: {
    thresholds: ModerationThresholds;
    categories?: string[]; // e.g., ["Hate", "SelfHarm", "Sexual", "Violence"]
  };
  timeoutMs: number; // p95 budget
  retries: number; // max retries (exponential backoff)
  enableFallback: boolean; // if primary fails, try secondary
}

export function getModerationConfig(): ModerationProviderConfig {
  const provider = (process.env.MODERATION_PROVIDER || 'hive').toLowerCase() as 'hive' | 'acs';
  const timeoutMs = parseInt(process.env.MODERATION_TIMEOUT_MS || '300', 10); // p95 < 300ms budget
  const retries = Math.min(parseInt(process.env.MODERATION_RETRIES || '2', 10), 2);
  const enableFallback = (process.env.MODERATION_FALLBACK || 'true').toLowerCase() === 'true';

  const hiveReject = parseFloat(process.env.HIVE_REJECT_THRESHOLD || '0.90');
  const hiveReview = parseFloat(process.env.HIVE_REVIEW_THRESHOLD || '0.70');

  const acsReject = parseFloat(process.env.ACS_REJECT_THRESHOLD || '0.90');
  const acsReview = parseFloat(process.env.ACS_REVIEW_THRESHOLD || '0.70');
  const categories = (process.env.ACS_CATEGORIES || 'Hate,Violence,Sexual').split(',').map(s => s.trim()).filter(Boolean);

  return {
    provider,
    hive: { thresholds: { reject: hiveReject, review: hiveReview } },
    acs: { thresholds: { reject: acsReject, review: acsReview }, categories },
    timeoutMs,
    retries,
    enableFallback,
  };
}

