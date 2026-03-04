import { getModerationConfig } from './moderationConfig';
import { createHiveClient } from './hive-client';
import { moderateTextWithACS } from './acs-client';
import { getAzureLogger, logPerformanceMetric } from './azure-logger';

export type ModerationDecision = 'allow' | 'review' | 'reject';

export interface TextModerationOutcome {
  provider: 'hive' | 'acs';
  decision: ModerationDecision;
  score: number;
  details?: Record<string, any>;
  durationMs: number;
}

export async function moderateProfileText(
  text: string,
  userId?: string
): Promise<TextModerationOutcome> {
  const cfg = getModerationConfig();
  const logger = getAzureLogger('moderation/text');

  const primary = cfg.provider;
  const secondary = primary === 'hive' ? 'acs' : 'hive';

  const attempt = async (provider: 'hive' | 'acs'): Promise<TextModerationOutcome> => {
    const start = Date.now();
    if (provider === 'hive') {
      const hive = createHiveClient();
      const res = await hive.moderateText(userId || 'system', text);
      const { HiveAIClient } = await import('./hive-client');
      const parsed = HiveAIClient.parseModerationResult(res);
      const score = parsed.confidence;
      const thr = cfg.hive!.thresholds;
      let decision: ModerationDecision =
        parsed.action === 'reject' ? 'reject' : parsed.action === 'review' ? 'review' : 'allow';
      if (score >= thr.reject) decision = 'reject';
      else if (score >= thr.review) decision = 'review';
      return { provider: 'hive', decision, score, details: parsed, durationMs: Date.now() - start };
    } else {
      const res = await moderateTextWithACS(text, cfg.acs!.categories || [], cfg.timeoutMs);
      const thr = cfg.acs!.thresholds;
      const decision: ModerationDecision =
        res.score >= thr.reject ? 'reject' : res.score >= thr.review ? 'review' : 'allow';
      return {
        provider: 'acs',
        decision,
        score: res.score,
        details: res.categoryScores,
        durationMs: Date.now() - start,
      };
    }
  };

  const backoff = (n: number) => new Promise(r => setTimeout(r, Math.pow(2, n) * 50));

  // Try primary with retries
  let lastErr: any;
  for (let i = 0; i <= cfg.retries; i++) {
    try {
      const out = await attempt(primary);
      logger.info('Text moderation decision', {
        provider: out.provider,
        decision: out.decision,
        score: out.score,
        durationMs: out.durationMs,
      });
      logPerformanceMetric(logger, 'moderation_text_latency_ms', out.durationMs, 'ms');
      return out;
    } catch (e) {
      lastErr = e;
      if (i < cfg.retries) await backoff(i);
    }
  }

  // Fallback
  if (cfg.enableFallback) {
    try {
      const out = await attempt(secondary);
      logger.info('Text moderation fallback decision', {
        provider: out.provider,
        decision: out.decision,
        score: out.score,
        durationMs: out.durationMs,
      });
      logPerformanceMetric(logger, 'moderation_text_latency_ms', out.durationMs, 'ms');
      return out;
    } catch (e2) {
      lastErr = e2;
    }
  }

  // Mark under_review on failure to get a decision
  const durationMs = 0;
  logger.warn('Text moderation provider(s) failed', { error: String(lastErr) });
  return { provider: primary, decision: 'review', score: 0, durationMs };
}
