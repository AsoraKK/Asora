/**
 * W11 – Observability: span names, status tagging, and telemetry contracts.
 *
 * Tests that:
 *  - SPAN_NAMES constants exist for every cross-cutting domain
 *  - startSpan() returns a Span with the correct name
 *  - setStatus('error') records the error status
 *  - recordException() triggers App Insights trackException
 *  - span.end() emits a `span:*` App Insights event with required fields
 *  - All SPAN_NAMES values are unique (no collisions)
 */

// ── Mock App Insights before importing the subject under test ─────────────────
jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
  trackException: jest.fn(),
  trackDependency: jest.fn(),
}));

import { trackAppEvent, trackException } from '@shared/appInsights';
import {
  SPAN_NAMES,
  startSpan,
  type Span,
  type SpanStatus,
} from '../../shared/telemetry';

const mockTrackAppEvent = trackAppEvent as jest.MockedFunction<typeof trackAppEvent>;
const mockTrackException = trackException as jest.MockedFunction<typeof trackException>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('SPAN_NAMES constants', () => {
  it('defines a span name for auth operations', () => {
    expect(SPAN_NAMES.AUTH_VERIFY_JWT).toBe('auth.verifyJwt');
    expect(SPAN_NAMES.AUTH_EXTRACT_CONTEXT).toBe('auth.extractContext');
  });

  it('defines a span name for feed operations', () => {
    expect(SPAN_NAMES.FEED_GET).toBe('feed.get');
    expect(SPAN_NAMES.FEED_NEWS_GET).toBe('feed.news.get');
    expect(SPAN_NAMES.FEED_DISCOVER_GET).toBe('feed.discover.get');
    expect(SPAN_NAMES.FEED_USER_GET).toBe('feed.user.get');
  });

  it('defines a span name for post operations', () => {
    expect(SPAN_NAMES.POST_CREATE).toBe('post.create');
    expect(SPAN_NAMES.POST_LIKE).toBe('post.like');
    expect(SPAN_NAMES.POST_UNLIKE).toBe('post.unlike');
  });

  it('defines a span name for moderation operations', () => {
    expect(SPAN_NAMES.MODERATION_REVIEW).toBe('moderation.review');
    expect(SPAN_NAMES.MODERATION_APPEAL_SUBMIT).toBe('moderation.appeal.submit');
    expect(SPAN_NAMES.MODERATION_APPEAL_REVIEW).toBe('moderation.appeal.review');
  });

  it('defines a span name for DSR / privacy operations', () => {
    expect(SPAN_NAMES.DSR_EXPORT_INIT).toBe('dsr.export.init');
    expect(SPAN_NAMES.DSR_DELETE_INIT).toBe('dsr.delete.init');
    expect(SPAN_NAMES.DSR_STATUS_GET).toBe('dsr.status.get');
  });

  it('defines span names for custom-feed and reputation operations', () => {
    expect(SPAN_NAMES.CUSTOM_FEED_CREATE).toBe('customFeed.create');
    expect(SPAN_NAMES.CUSTOM_FEED_LIST).toBe('customFeed.list');
    expect(SPAN_NAMES.REPUTATION_ADJUST).toBe('reputation.adjust');
  });

  it('has no duplicate span name values', () => {
    const values = Object.values(SPAN_NAMES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('all span names follow <domain>.<action> dot-notation', () => {
    for (const name of Object.values(SPAN_NAMES)) {
      expect(name).toMatch(/^[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9.]+$/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('startSpan()', () => {
  it('returns a Span with the given name', () => {
    const span = startSpan(SPAN_NAMES.FEED_GET);
    expect(span.name).toBe('feed.get');
    span.end();
  });

  it('emits a span:* App Insights event on end()', () => {
    const span = startSpan(SPAN_NAMES.POST_CREATE);
    span.setStatus('ok');
    span.end();

    expect(mockTrackAppEvent).toHaveBeenCalledTimes(1);
    const [call] = mockTrackAppEvent.mock.calls;
    expect(call[0].name).toBe('span:post.create');
  });

  it('includes span.name and span.status in the event properties', () => {
    const span = startSpan(SPAN_NAMES.MODERATION_REVIEW);
    span.setStatus('ok');
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['span.name']).toBe('moderation.review');
    expect(props?.['span.status']).toBe('ok');
  });

  it('includes span.durationMs as a non-negative number', () => {
    const span = startSpan(SPAN_NAMES.DSR_EXPORT_INIT);
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(typeof props?.['span.durationMs']).toBe('number');
    expect(props?.['span.durationMs'] as number).toBeGreaterThanOrEqual(0);
  });

  it('setAttribute() merges extra dimensions into the event', () => {
    const span = startSpan(SPAN_NAMES.FEED_GET);
    span.setAttribute('feed.type', 'home').setAttribute('feed.limit', 20);
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['feed.type']).toBe('home');
    expect(props?.['feed.limit']).toBe(20);
  });

  it('initial attributes passed to startSpan() are included in the event', () => {
    const span = startSpan(SPAN_NAMES.AUTH_VERIFY_JWT, { 'auth.provider': 'google' });
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['auth.provider']).toBe('google');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('span error tagging', () => {
  it('setStatus("error") marks span.error = true in the event', () => {
    const span = startSpan(SPAN_NAMES.POST_CREATE);
    span.setStatus('error', 'Cosmos write failed');
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['span.error']).toBe(true);
    expect(props?.['span.status']).toBe('error');
    expect(props?.['span.statusMessage']).toBe('Cosmos write failed');
  });

  it('recordException() sets status to error and calls trackException', () => {
    const err = new Error('DB timeout');
    const span = startSpan(SPAN_NAMES.CUSTOM_FEED_CREATE);
    span.recordException(err);
    span.end();

    expect(mockTrackException).toHaveBeenCalledTimes(1);
    expect(mockTrackException.mock.calls[0]?.[0]).toBe(err);

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['span.error']).toBe(true);
  });

  it('trackException receives span.name in properties', () => {
    const err = new Error('Timeout');
    const span = startSpan(SPAN_NAMES.DSR_DELETE_INIT);
    span.recordException(err);
    span.end();

    const exceptionProps = mockTrackException.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(exceptionProps?.['span.name']).toBe('dsr.delete.init');
  });

  it('setStatus("ok") marks span.error = false in the event', () => {
    const span = startSpan(SPAN_NAMES.REPUTATION_ADJUST);
    span.setStatus('ok');
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['span.error']).toBe(false);
  });

  it('default status "unset" does not set span.error to true', () => {
    const span = startSpan(SPAN_NAMES.FEED_DISCOVER_GET);
    span.end();

    const props = mockTrackAppEvent.mock.calls[0]?.[0].properties as Record<string, unknown>;
    expect(props?.['span.error']).toBe(false);
  });
});
