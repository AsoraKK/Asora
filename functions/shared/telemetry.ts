/**
 * Lightweight span abstraction for Asora backend telemetry.
 *
 * Wraps Application Insights events so each instrumented operation records:
 *   - canonical span name (from SPAN_NAMES)
 *   - duration in ms
 *   - status (ok / error / unset)
 *   - arbitrary string/number/boolean attributes
 *
 * When the full OpenTelemetry SDK is adopted in a future sprint this module
 * can be swapped out behind the same interface without touching call-sites.
 *
 * Usage:
 *   const span = startSpan(SPAN_NAMES.FEED_GET, { 'feed.type': 'home' });
 *   try {
 *     await doWork();
 *     span.setStatus('ok');
 *   } catch (err) {
 *     span.recordException(err as Error);
 *     throw err;
 *   } finally {
 *     span.end();
 *   }
 */

import { performance } from 'perf_hooks';
import { trackAppEvent, trackException } from '../src/shared/appInsights';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical span names — used as the unit of work identifier in telemetry
// ─────────────────────────────────────────────────────────────────────────────
export const SPAN_NAMES = {
  // Auth
  AUTH_VERIFY_JWT: 'auth.verifyJwt',
  AUTH_EXTRACT_CONTEXT: 'auth.extractContext',
  // Feed
  FEED_GET: 'feed.get',
  FEED_NEWS_GET: 'feed.news.get',
  FEED_DISCOVER_GET: 'feed.discover.get',
  FEED_USER_GET: 'feed.user.get',
  // Posts
  POST_CREATE: 'post.create',
  POST_LIKE: 'post.like',
  POST_UNLIKE: 'post.unlike',
  // Moderation
  MODERATION_REVIEW: 'moderation.review',
  MODERATION_APPEAL_SUBMIT: 'moderation.appeal.submit',
  MODERATION_APPEAL_REVIEW: 'moderation.appeal.review',
  // DSR / Privacy
  DSR_EXPORT_INIT: 'dsr.export.init',
  DSR_DELETE_INIT: 'dsr.delete.init',
  DSR_STATUS_GET: 'dsr.status.get',
  // Custom feeds
  CUSTOM_FEED_CREATE: 'customFeed.create',
  CUSTOM_FEED_LIST: 'customFeed.list',
  // Reputation
  REPUTATION_ADJUST: 'reputation.adjust',
} as const;

export type SpanName = (typeof SPAN_NAMES)[keyof typeof SPAN_NAMES];
export type SpanStatus = 'unset' | 'ok' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────────────────────────────────────
export interface Span {
  readonly name: string;
  setAttribute(key: string, value: string | number | boolean): this;
  setStatus(status: SpanStatus, message?: string): this;
  recordException(error: Error): this;
  end(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────
class AppInsightsSpan implements Span {
  readonly name: string;
  private readonly startMs: number;
  private attrs: Record<string, string | number | boolean> = {};
  private status: SpanStatus = 'unset';
  private statusMessage?: string;
  private caughtError?: Error;

  constructor(name: string, attrs?: Record<string, string | number | boolean>) {
    this.name = name;
    this.startMs = performance.now();
    if (attrs) {
      Object.assign(this.attrs, attrs);
    }
  }

  setAttribute(key: string, value: string | number | boolean): this {
    this.attrs[key] = value;
    return this;
  }

  setStatus(status: SpanStatus, message?: string): this {
    this.status = status;
    this.statusMessage = message;
    return this;
  }

  recordException(error: Error): this {
    this.caughtError = error;
    this.status = 'error';
    return this;
  }

  end(): void {
    const durationMs = Math.round(performance.now() - this.startMs);
    const isError = this.status === 'error';

    if (this.caughtError) {
      trackException(this.caughtError, {
        'span.name': this.name,
        'span.durationMs': durationMs,
        ...this.attrs,
      });
    }

    trackAppEvent({
      name: `span:${this.name}`,
      properties: {
        'span.name': this.name,
        'span.status': this.status,
        'span.durationMs': durationMs,
        'span.error': isError,
        ...(this.statusMessage ? { 'span.statusMessage': this.statusMessage } : {}),
        ...this.attrs,
      },
    });
  }
}

/**
 * Start a new span.  Always call `span.end()` in a `finally` block to ensure
 * the span is flushed even when the operation throws.
 */
export function startSpan(
  name: string,
  attrs?: Record<string, string | number | boolean>,
): Span {
  return new AppInsightsSpan(name, attrs);
}
