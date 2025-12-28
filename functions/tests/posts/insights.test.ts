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
  describe('mapDecisionToRiskBand', () => {
    it('should map "block" to HIGH', () => {
      expect(mapDecisionToRiskBand('block')).toBe('HIGH');
    });

    it('should map "queue" to MEDIUM', () => {
      expect(mapDecisionToRiskBand('queue')).toBe('MEDIUM');
    });

    it('should map "allow" to LOW', () => {
      expect(mapDecisionToRiskBand('allow')).toBe('LOW');
    });

    it('should map unknown decision to MEDIUM (conservative)', () => {
      expect(mapDecisionToRiskBand('unknown' as any)).toBe('MEDIUM');
    });
  });

  describe('mapDecisionToInsightDecision', () => {
    it('should map "block" to BLOCK', () => {
      expect(mapDecisionToInsightDecision('block')).toBe('BLOCK');
    });

    it('should map "queue" to QUEUE', () => {
      expect(mapDecisionToInsightDecision('queue')).toBe('QUEUE');
    });

    it('should map "allow" to ALLOW', () => {
      expect(mapDecisionToInsightDecision('allow')).toBe('ALLOW');
    });

    it('should map unknown to QUEUE (conservative)', () => {
      expect(mapDecisionToInsightDecision('unknown' as any)).toBe('QUEUE');
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

    it('should build response from decision record', () => {
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
        decision: 'queue',
        reasonCodes: ['HIVE_SCORE_OVER_FLAG_THRESHOLD'],
        correlationId: 'corr-123',
        usedFallback: false,
      };

      const response = buildInsightsResponse('post-123', decision, { status: 'PENDING', updatedAt: '2025-12-28T11:00:00.000Z' });

      expect(response.postId).toBe('post-123');
      expect(response.riskBand).toBe('MEDIUM');
      expect(response.decision).toBe('QUEUE');
      expect(response.reasonCodes).toContain('HIVE_SCORE_OVER_FLAG_THRESHOLD');
      expect(response.configVersion).toBe(5);
      expect(response.decidedAt).toBe('2025-12-28T10:00:00.000Z');
      expect(response.appeal.status).toBe('PENDING');
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
    });
  });
});
