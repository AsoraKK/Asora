/**
 * Tests for insightsService
 *
 * Covers:
 * - Decision to risk band mapping
 * - Response sanitization
 * - Forbidden field detection
 */

import {
  mapDecisionToRiskBand,
  mapDecisionToInsightDecision,
  sanitizeReasonCodes,
  buildInsightsResponse,
  containsForbiddenFields,
  FORBIDDEN_INSIGHT_FIELDS,
  type PostInsightsResponse,
} from '../../src/posts/service/insightsService';
import type { ModerationDecisionRecord } from '../../src/moderation/service/decisionLogger';

describe('insightsService', () => {
  describe('mapDecisionToRiskBand (appeal-aware)', () => {
    it('should map "allow" to LOW regardless of appeal status', () => {
      expect(mapDecisionToRiskBand('allow', 'NONE')).toBe('LOW');
      expect(mapDecisionToRiskBand('allow', 'PENDING')).toBe('LOW');
      expect(mapDecisionToRiskBand('allow', 'APPROVED')).toBe('LOW');
    });

    it('should map "block" + PENDING appeal to MEDIUM (under review)', () => {
      expect(mapDecisionToRiskBand('block', 'PENDING')).toBe('MEDIUM');
    });

    it('should map "block" + non-pending appeal to HIGH', () => {
      expect(mapDecisionToRiskBand('block', 'NONE')).toBe('HIGH');
      expect(mapDecisionToRiskBand('block', 'REJECTED')).toBe('HIGH');
      expect(mapDecisionToRiskBand('block', 'APPROVED')).toBe('HIGH');
    });

    it('should map "queue" + PENDING appeal to MEDIUM (collapsed to BLOCK, under review)', () => {
      expect(mapDecisionToRiskBand('queue', 'PENDING')).toBe('MEDIUM');
    });

    it('should map "queue" + non-pending appeal to HIGH (collapsed to BLOCK)', () => {
      expect(mapDecisionToRiskBand('queue', 'NONE')).toBe('HIGH');
    });

    it('should map unknown decision to HIGH (safe default)', () => {
      expect(mapDecisionToRiskBand('unknown' as any, 'NONE')).toBe('HIGH');
    });
  });

  describe('mapDecisionToInsightDecision (binary)', () => {
    it('should map "block" to BLOCK', () => {
      expect(mapDecisionToInsightDecision('block')).toBe('BLOCK');
    });

    it('should collapse "queue" to BLOCK (binary model)', () => {
      expect(mapDecisionToInsightDecision('queue')).toBe('BLOCK');
    });

    it('should map "allow" to ALLOW', () => {
      expect(mapDecisionToInsightDecision('allow')).toBe('ALLOW');
    });

    it('should map unknown to BLOCK (safe default)', () => {
      expect(mapDecisionToInsightDecision('unknown' as any)).toBe('BLOCK');
    });
  });

  describe('sanitizeReasonCodes', () => {
    it('should keep allowed reason codes', () => {
      const codes = [
        'HIVE_SCORE_OVER_THRESHOLD',
        'FALLBACK_USED',
        'AUTO_MODERATION_DISABLED',
      ];
      expect(sanitizeReasonCodes(codes)).toEqual(codes);
    });

    it('should filter out unknown codes', () => {
      const codes = [
        'HIVE_SCORE_OVER_THRESHOLD',
        'SOME_RANDOM_CODE',
        'SCORE_123', // could leak numeric info
      ];
      expect(sanitizeReasonCodes(codes)).toEqual(['HIVE_SCORE_OVER_THRESHOLD']);
    });

    it('should return empty array for all invalid codes', () => {
      const codes = ['INVALID_CODE', 'ANOTHER_BAD'];
      expect(sanitizeReasonCodes(codes)).toEqual([]);
    });
  });

  describe('buildInsightsResponse', () => {
    it('should return defaults when no decision exists', () => {
      const response = buildInsightsResponse('post-123', null, { status: 'NONE' });

      expect(response.postId).toBe('post-123');
      expect(response.riskBand).toBe('LOW');
      expect(response.decision).toBe('ALLOW');
      expect(response.reasonCodes).toEqual([]);
      expect(response.configVersion).toBe(0);
      expect(response.appeal.status).toBe('NONE');
    });

    it('should collapse QUEUE to BLOCK in response', () => {
      const decision: ModerationDecisionRecord = {
        id: 'dec-123',
        itemId: 'post-123',
        createdAt: '2025-12-28T10:00:00.000Z',
        contentType: 'post',
        provider: 'hive_v2',
        signals: {
          confidence: 0.85,
          categoryScores: { hate: 0.7 },
          categories: ['hate'],
        },
        thresholdsUsed: {
          configVersion: 5,
          flagThreshold: 0.5,
          removeThreshold: 0.9,
        },
        decision: 'queue',  // Internal QUEUE
        reasonCodes: ['HIVE_SCORE_OVER_FLAG_THRESHOLD'],
        correlationId: 'corr-123',
        usedFallback: false,
      };

      const response = buildInsightsResponse('post-123', decision, { status: 'NONE' });

      // QUEUE must be collapsed to BLOCK
      expect(response.decision).toBe('BLOCK');
      // Without pending appeal, band is HIGH
      expect(response.riskBand).toBe('HIGH');
    });

    it('should set MEDIUM band when BLOCK + appeal PENDING', () => {
      const decision: ModerationDecisionRecord = {
        id: 'dec-123',
        itemId: 'post-123',
        createdAt: '2025-12-28T10:00:00.000Z',
        contentType: 'post',
        provider: 'hive_v2',
        signals: {},
        thresholdsUsed: { configVersion: 5, flagThreshold: 0.5, removeThreshold: 0.9 },
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
        correlationId: null,
        usedFallback: false,
      };

      const response = buildInsightsResponse('post-123', decision, { status: 'PENDING', updatedAt: '2025-12-28T11:00:00.000Z' });

      expect(response.decision).toBe('BLOCK');
      expect(response.riskBand).toBe('MEDIUM');  // PENDING appeal = under review
      expect(response.appeal.status).toBe('PENDING');
    });

    it('should set HIGH band when BLOCK + appeal not pending', () => {
      const decision: ModerationDecisionRecord = {
        id: 'dec-123',
        itemId: 'post-123',
        createdAt: '2025-12-28T10:00:00.000Z',
        contentType: 'post',
        provider: 'hive_v2',
        signals: {},
        thresholdsUsed: { configVersion: 5, flagThreshold: 0.5, removeThreshold: 0.9 },
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
        correlationId: null,
        usedFallback: false,
      };

      const response = buildInsightsResponse('post-123', decision, { status: 'REJECTED' });

      expect(response.decision).toBe('BLOCK');
      expect(response.riskBand).toBe('HIGH');
    });

    it('should not include raw scores in response', () => {
      const decision: ModerationDecisionRecord = {
        id: 'dec-123',
        itemId: 'post-123',
        createdAt: '2025-12-28T10:00:00.000Z',
        contentType: 'post',
        provider: 'hive_v2',
        signals: {
          confidence: 0.95,
          categoryScores: { toxicity: 0.99 },
        },
        thresholdsUsed: {
          configVersion: 10,
          flagThreshold: 0.5,
          removeThreshold: 0.9,
        },
        decision: 'block',
        reasonCodes: ['HIVE_SCORE_OVER_THRESHOLD'],
        correlationId: null,
        usedFallback: false,
      };

      const response = buildInsightsResponse('post-123', decision, { status: 'NONE' });

      // Verify no forbidden fields are present
      const forbidden = containsForbiddenFields(response);
      expect(forbidden).toEqual([]);

      // Explicitly check known fields
      expect((response as any).confidence).toBeUndefined();
      expect((response as any).score).toBeUndefined();
      expect((response as any).scores).toBeUndefined();
      expect((response as any).threshold).toBeUndefined();
      expect((response as any).categoryScores).toBeUndefined();
    });

    it('should never include QUEUE in response decision', () => {
      // Test all possible internal decisions
      const decisions: Array<'allow' | 'block' | 'queue'> = ['allow', 'block', 'queue'];

      for (const d of decisions) {
        const decision: ModerationDecisionRecord = {
          id: 'dec-123',
          itemId: 'post-123',
          createdAt: '2025-12-28T10:00:00.000Z',
          contentType: 'post',
          provider: 'hive_v2',
          signals: {},
          thresholdsUsed: { configVersion: 1, flagThreshold: 0.5, removeThreshold: 0.9 },
          decision: d,
          reasonCodes: [],
          correlationId: null,
          usedFallback: false,
        };

        const response = buildInsightsResponse('post-123', decision, { status: 'NONE' });

        // Decision must be ALLOW or BLOCK only, never QUEUE
        expect(['ALLOW', 'BLOCK']).toContain(response.decision);
        expect(response.decision).not.toBe('QUEUE');
      }
    });
  });

  describe('containsForbiddenFields', () => {
    it('should return empty array for clean response', () => {
      const clean: PostInsightsResponse = {
        postId: 'post-123',
        riskBand: 'LOW',
        decision: 'ALLOW',
        reasonCodes: [],
        configVersion: 1,
        decidedAt: '2025-12-28T10:00:00.000Z',
        appeal: { status: 'NONE' },
      };

      expect(containsForbiddenFields(clean)).toEqual([]);
    });

    it('should detect score field', () => {
      const dirty = {
        postId: 'post-123',
        score: 0.85, // FORBIDDEN
      };

      const found = containsForbiddenFields(dirty);
      expect(found.length).toBeGreaterThan(0);
      expect(found.some(f => f.includes('score'))).toBe(true);
    });

    it('should detect threshold field', () => {
      const dirty = {
        postId: 'post-123',
        threshold: 0.5, // FORBIDDEN
      };

      const found = containsForbiddenFields(dirty);
      expect(found.length).toBeGreaterThan(0);
      expect(found.some(f => f.includes('threshold'))).toBe(true);
    });

    it('should detect nested forbidden fields', () => {
      const dirty = {
        postId: 'post-123',
        details: {
          categoryScores: { hate: 0.8 }, // FORBIDDEN
        },
      };

      const found = containsForbiddenFields(dirty);
      expect(found.length).toBeGreaterThan(0);
    });

    it('should detect probability field', () => {
      const dirty = {
        postId: 'post-123',
        probability: 0.75, // FORBIDDEN
      };

      const found = containsForbiddenFields(dirty);
      expect(found.some(f => f.includes('probability'))).toBe(true);
    });

    it('should detect confidence field', () => {
      const dirty = {
        postId: 'post-123',
        confidence: 0.9, // FORBIDDEN
      };

      const found = containsForbiddenFields(dirty);
      expect(found.some(f => f.includes('confidence'))).toBe(true);
    });
  });

  describe('FORBIDDEN_INSIGHT_FIELDS', () => {
    it('should include all sensitive field names', () => {
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('score');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('probability');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('threshold');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('severity');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('confidence');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('categoryScores');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('rawResponse');
      expect(FORBIDDEN_INSIGHT_FIELDS).toContain('queue');  // QUEUE must not be exposed
    });

    it('should detect queue in response (forbidden as decision value)', () => {
      const dirty = {
        postId: 'post-123',
        decision: 'QUEUE',  // FORBIDDEN - only ALLOW/BLOCK allowed
        queueReason: 'threshold', // any field containing 'queue'
      };

      const found = containsForbiddenFields(dirty);
      expect(found.some(f => f.toLowerCase().includes('queue'))).toBe(true);
    });
  });
});