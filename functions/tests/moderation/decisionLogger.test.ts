/// <reference types="jest" />
/**
 * Decision Logger Tests
 *
 * Tests for moderation decision logging to Cosmos DB.
 * Validates record shape, forbidden fields (PII), and observability events.
 */

// Track Cosmos operations
const cosmosItems: Map<string, any> = new Map();
const trackEventCalls: Array<{ name: string; properties?: Record<string, any> }> = [];
const trackMetricCalls: Array<{ name: string; value: number; properties?: Record<string, any> }> = [];

// Mock Cosmos
jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    moderationDecisions: {
      items: {
        create: jest.fn(async (doc: any) => {
          cosmosItems.set(doc.id, doc);
          return { resource: doc };
        }),
      },
    },
  })),
}));

// Mock App Insights
jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn((payload: { name: string; properties?: Record<string, any> }) => {
    trackEventCalls.push({ name: payload.name, properties: payload.properties });
  }),
  trackAppMetric: jest.fn((payload: { name: string; value: number; properties?: Record<string, any> }) => {
    trackMetricCalls.push({ name: payload.name, value: payload.value, properties: payload.properties });
  }),
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  }),
}));

import {
  recordModerationDecision,
  buildReasonCodes,
  type ModerationSignals,
  type RecordModerationDecisionInput,
} from '../../src/moderation/service/decisionLogger';
import type { ModerationConfigEnvelope } from '../../src/moderation/config/moderationConfigProvider';

describe('DecisionLogger', () => {
  beforeEach(() => {
    cosmosItems.clear();
    trackEventCalls.length = 0;
    trackMetricCalls.length = 0;
  });

  describe('recordModerationDecision', () => {
    const baseSignals: ModerationSignals = {
      confidence: 0.75,
      categoryScores: {
        sexual: 0.1,
        hate: 0.2,
        violence: 0.75,
        drugs: 0.05,
      },
      categories: ['violence'],
      providerAction: 'review',
    };

    const baseConfigEnvelope: ModerationConfigEnvelope = {
      config: {
        hiveAutoFlagThreshold: 0.5,
        hiveAutoRemoveThreshold: 0.85,
        flagAutoHideThreshold: 5,
        reasonPriorityScores: {},
        urgencyMultipliers: {},
        appealRequiredVotes: 5,
        enableAutoModeration: true,
      },
      version: 42,
      updatedAt: '2024-01-15T10:30:00Z',
      fetchedAt: Date.now(),
    };

    it('records decision with required fields', async () => {
      const input: RecordModerationDecisionInput = {
        itemId: 'post-123',
        contentType: 'post',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: baseConfigEnvelope,
        decision: 'queue',
        reasonCodes: ['HIVE_SCORE_OVER_FLAG_THRESHOLD'],
      };

      const record = await recordModerationDecision(input);

      expect(record).toBeDefined();
      expect(record.itemId).toBe('post-123');
      expect(record.contentType).toBe('post');
      expect(record.decision).toBe('queue');
      expect(record.signals.confidence).toBe(0.75);
      expect(record.thresholdsUsed.configVersion).toBe(42);
      expect(record.createdAt).toBeDefined();
    });

    it('includes reason codes when provided', async () => {
      const input: RecordModerationDecisionInput = {
        itemId: 'post-456',
        contentType: 'post',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: baseConfigEnvelope,
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD', 'FALLBACK_USED'],
        usedFallback: true,
      };

      const record = await recordModerationDecision(input);

      expect(record.reasonCodes).toEqual(['HIVE_SCORE_OVER_THRESHOLD', 'FALLBACK_USED']);
      expect(record.usedFallback).toBe(true);
    });

    it('emits moderation.decision.made event', async () => {
      const input: RecordModerationDecisionInput = {
        itemId: 'post-789',
        contentType: 'post',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: baseConfigEnvelope,
        decision: 'allow',
        reasonCodes: ['HIVE_SCORE_UNDER_THRESHOLD'],
      };

      await recordModerationDecision(input);

      const decisionEvent = trackEventCalls.find(
        (e) => e.name === 'moderation.decision.made'
      );

      expect(decisionEvent).toBeDefined();
      expect(decisionEvent?.properties?.decision).toBe('allow');
      expect(decisionEvent?.properties?.contentType).toBe('post');
    });

    it('does NOT include user content in the record', async () => {
      const input: RecordModerationDecisionInput = {
        itemId: 'post-111',
        contentType: 'post',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: baseConfigEnvelope,
        decision: 'queue',
        reasonCodes: ['HIVE_SCORE_OVER_FLAG_THRESHOLD'],
      };

      const record = await recordModerationDecision(input);

      // These fields should NOT exist (PII / content privacy)
      expect((record as any).content).toBeUndefined();
      expect((record as any).userContent).toBeUndefined();
      expect((record as any).text).toBeUndefined();
      expect((record as any).body).toBeUndefined();
      expect((record as any).userId).toBeUndefined();
      expect((record as any).authorId).toBeUndefined();
    });

    it('uses partition key /itemId', async () => {
      const input: RecordModerationDecisionInput = {
        itemId: 'post-222',
        contentType: 'comment',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: baseConfigEnvelope,
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
      };

      const record = await recordModerationDecision(input);

      // itemId should be the partition key field
      expect(record.itemId).toBe('post-222');
    });

    it('includes configVersion in thresholdsUsed', async () => {
      const customEnvelope: ModerationConfigEnvelope = {
        ...baseConfigEnvelope,
        version: 99,
      };

      const input: RecordModerationDecisionInput = {
        itemId: 'post-333',
        contentType: 'post',
        provider: 'hive_v2',
        signals: baseSignals,
        configEnvelope: customEnvelope,
        decision: 'allow',
        reasonCodes: ['HIVE_SCORE_UNDER_THRESHOLD'],
      };

      const record = await recordModerationDecision(input);

      expect(record.thresholdsUsed.configVersion).toBe(99);
    });
  });

  describe('buildReasonCodes', () => {
    it('returns HIVE_SCORE_UNDER_THRESHOLD for low scores', () => {
      const codes = buildReasonCodes(
        0.2,   // confidence
        0.5,   // flagThreshold
        0.85,  // removeThreshold
        'allow',
        false, // usedFallback
        false  // providerError
      );

      expect(codes).toContain('HIVE_SCORE_UNDER_THRESHOLD');
      expect(codes).not.toContain('HIVE_SCORE_OVER_THRESHOLD');
    });

    it('returns HIVE_SCORE_OVER_FLAG_THRESHOLD for medium scores', () => {
      const codes = buildReasonCodes(
        0.6,   // confidence (above flag, below remove)
        0.5,   // flagThreshold
        0.85,  // removeThreshold
        'queue',
        false, // usedFallback
        false  // providerError
      );

      expect(codes).toContain('HIVE_SCORE_OVER_FLAG_THRESHOLD');
      expect(codes).not.toContain('HIVE_SCORE_OVER_THRESHOLD');
    });

    it('returns HIVE_SCORE_OVER_THRESHOLD for high scores', () => {
      const codes = buildReasonCodes(
        0.9,   // confidence (above remove)
        0.5,   // flagThreshold
        0.85,  // removeThreshold
        'block',
        false, // usedFallback
        false  // providerError
      );

      expect(codes).toContain('HIVE_SCORE_OVER_THRESHOLD');
    });

    it('includes FALLBACK_USED when fallback provider was used', () => {
      const codes = buildReasonCodes(
        0.3,
        0.5,
        0.85,
        'allow',
        true,  // usedFallback
        false  // providerError
      );

      expect(codes).toContain('FALLBACK_USED');
    });

    it('includes PROVIDER_ERROR_QUEUE when provider errored', () => {
      const codes = buildReasonCodes(
        0,
        0.5,
        0.85,
        'queue',
        false,
        true   // providerError
      );

      expect(codes).toContain('PROVIDER_ERROR_QUEUE');
    });
  });
});
