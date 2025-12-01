import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('shared/chaos');

const rawChaosEnabled = process.env.CHAOS_ENABLED ?? 'false';
const rawLatency = process.env.CHAOS_LATENCY_MS ?? '0';
const rawErrorRate = process.env.CHAOS_ERROR_RATE ?? '0';
const appEnv = (process.env.APP_ENV ?? '').toLowerCase();
const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();

const CHAOS_ENABLED = rawChaosEnabled.toLowerCase() === 'true';
const CHAOS_LATENCY_MS = Math.max(0, Number(rawLatency) || 0);
const CHAOS_ERROR_RATE = Math.min(1, Math.max(0, Number(rawErrorRate) || 0));
const IS_PRODUCTION = appEnv === 'prod' || nodeEnv === 'production';
const chaosAllowed = CHAOS_ENABLED && !IS_PRODUCTION;

if (CHAOS_ENABLED && IS_PRODUCTION) {
  logger.warn('Chaos injection disabled in production environment', {
    appEnv,
    nodeEnv,
  });
}

if (chaosAllowed) {
  logger.info('Chaos middleware enabled', {
    latencyMs: CHAOS_LATENCY_MS,
    errorRate: CHAOS_ERROR_RATE,
  });
}

export type ChaosHandler<T extends HttpRequest = HttpRequest> = (
  req: T,
  context: InvocationContext
) => Promise<HttpResponseInit>;

export function withChaos<T extends HttpRequest = HttpRequest>(handler: ChaosHandler<T>): ChaosHandler<T> {
  return async (req, context) => {
    if (!chaosAllowed) {
      return handler(req, context);
    }

    if (CHAOS_LATENCY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, CHAOS_LATENCY_MS));
    }

    if (CHAOS_ERROR_RATE > 0 && Math.random() < CHAOS_ERROR_RATE) {
      context.log('chaos.injected.error', {
        source: 'chaos-middleware',
        errorRate: CHAOS_ERROR_RATE,
      });
      return {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'CHAOS_INJECTED',
          message: 'Chaos middleware injected a failure.',
        }),
      };
    }

    return handler(req, context);
  };
}
