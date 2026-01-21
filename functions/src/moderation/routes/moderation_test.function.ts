/**
 * Moderation Test Function
 * 
 * POST /api/moderation/test
 * 
 * Test Hive AI moderation without creating content.
 * Used by Control Panel for API testing and validation.
 * 
 * OpenAPI: moderation_test
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { createHiveClient, ModerationAction, ModerationCategory } from '../../shared/clients/hive';

interface ModerationTestRequest {
  type: 'text' | 'image';
  content?: string;   // For text moderation
  url?: string;       // For image moderation
  isTestMode?: boolean;
}

interface ModerationTestResponse {
  action: string;
  confidence: number;
  categories: string[];
  reasons: string[];
  requestId: string;
  classScores: Record<string, number>;
  processingTimeMs: number;
  isLive: boolean;
}

export const moderation_test = httpHandler<ModerationTestRequest, ModerationTestResponse>(async (ctx) => {
  ctx.context.log(`[moderation_test] Testing moderation API [${ctx.correlationId}]`);

  // Require authentication
  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  // Require admin role for testing
  const isAdmin = auth.roles?.includes('admin') || auth.roles?.includes('moderator');
  if (!isAdmin) {
    return ctx.forbidden('Admin or moderator role required', 'FORBIDDEN');
  }

  const request = ctx.body;
  if (!request || !request.type) {
    return ctx.badRequest('Request type is required (text or image)', 'INVALID_TYPE');
  }

  // Check for Hive API key
  const apiKey = process.env.HIVE_API_KEY;
  if (!apiKey) {
    // Return mock response if no API key configured
    ctx.context.log('[moderation_test] No HIVE_API_KEY configured, returning mock response');
    return ctx.ok(generateMockResponse(request, false));
  }

  const startTime = Date.now();

  try {
    const hiveClient = createHiveClient({
      apiKey,
      isTestMode: true,
      testSessionId: `control-panel-test-${auth.userId}`,
    });

    if (request.type === 'text') {
      if (!request.content || request.content.trim().length === 0) {
        return ctx.badRequest('Text content is required for text moderation', 'MISSING_CONTENT');
      }

      const result = await hiveClient.moderateTextContent({
        text: request.content,
        userId: auth.userId,
        contentId: `test-${ctx.correlationId}`,
      });

      const processingTimeMs = Date.now() - startTime;

      return ctx.ok({
        action: result.action,
        confidence: result.confidence,
        categories: result.categories,
        reasons: result.reasons,
        requestId: result.requestId || ctx.correlationId,
        classScores: extractClassScores(result.raw),
        processingTimeMs,
        isLive: true,
      });
    } else if (request.type === 'image') {
      if (!request.url || request.url.trim().length === 0) {
        return ctx.badRequest('Image URL is required for image moderation', 'MISSING_URL');
      }

      const result = await hiveClient.moderateImage(
        auth.userId,
        request.url
      );

      const processingTimeMs = Date.now() - startTime;

      // Convert raw Hive response to standardized format
      const classScores = extractClassScores(result);
      const { action, confidence, categories, reasons } = analyzeImageResponse(result);

      return ctx.ok({
        action,
        confidence,
        categories,
        reasons,
        requestId: result.id || ctx.correlationId,
        classScores,
        processingTimeMs,
        isLive: true,
      });
    } else {
      return ctx.badRequest('Invalid type. Use "text" or "image"', 'INVALID_TYPE');
    }
  } catch (error) {
    ctx.context.error(`[moderation_test] Hive API error: ${error}`, { correlationId: ctx.correlationId });
    
    // Return error details for debugging
    return ctx.ok({
      action: 'ERROR',
      confidence: 0,
      categories: [],
      reasons: [`API Error: ${(error as Error).message}`],
      requestId: ctx.correlationId,
      classScores: {},
      processingTimeMs: Date.now() - startTime,
      isLive: true,
    });
  }
});

/**
 * Extract class scores from raw Hive response
 */
function extractClassScores(raw: unknown): Record<string, number> {
  const scores: Record<string, number> = {};
  
  if (!raw || typeof raw !== 'object') {
    return scores;
  }

  try {
    const response = raw as { status?: Array<{ response?: { output?: Array<{ classes?: Array<{ class: string; score: number }> }> } }> };
    const outputs = response.status?.[0]?.response?.output || [];
    
    for (const output of outputs) {
      for (const cls of output.classes || []) {
        if (cls.class && typeof cls.score === 'number') {
          scores[cls.class] = cls.score;
        }
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return scores;
}

/**
 * Analyze raw Hive image response and determine action
 */
function analyzeImageResponse(raw: unknown): { action: string; confidence: number; categories: string[]; reasons: string[] } {
  const scores = extractClassScores(raw);
  const categories: string[] = [];
  const reasons: string[] = [];
  
  let maxScore = 0;
  
  // Check each class score against thresholds
  for (const [className, score] of Object.entries(scores)) {
    if (score > maxScore) maxScore = score;
    
    if (score >= 0.85) {
      // High confidence violation
      if (className.includes('nsfw') || className.includes('nude') || className.includes('sexual')) {
        categories.push('adult_content');
        reasons.push(`High ${className} score: ${(score * 100).toFixed(1)}%`);
      } else if (className.includes('violence') || className.includes('gore')) {
        categories.push('violence');
        reasons.push(`High ${className} score: ${(score * 100).toFixed(1)}%`);
      } else if (className.includes('hate')) {
        categories.push('hate_speech');
        reasons.push(`High ${className} score: ${(score * 100).toFixed(1)}%`);
      }
    } else if (score >= 0.5) {
      // Borderline - flag for review
      if (className.includes('nsfw') || className.includes('nude') || className.includes('violence')) {
        reasons.push(`Borderline ${className} score: ${(score * 100).toFixed(1)}%`);
      }
    }
  }
  
  let action = 'ALLOW';
  if (categories.length > 0 && maxScore >= 0.85) {
    action = 'BLOCK';
  } else if (maxScore >= 0.5) {
    action = 'WARN';
  }
  
  if (reasons.length === 0) {
    reasons.push('Image passed all safety checks');
  }
  
  return {
    action,
    confidence: maxScore,
    categories: [...new Set(categories)],
    reasons,
  };
}

/**
 * Generate mock response for testing when API key not configured
 */
function generateMockResponse(request: ModerationTestRequest, isLive: boolean): ModerationTestResponse {
  const content = request.content?.toLowerCase() || request.url?.toLowerCase() || '';
  const hasNegative = /hate|angry|kill|stupid|idiot|damn|violence/.test(content);
  const hasExplicit = /sex|nude|porn|nsfw|adult/.test(content);

  let action = 'ALLOW';
  let confidence = 0.12 + Math.random() * 0.2;
  const categories: string[] = [];
  const reasons: string[] = [];

  if (hasExplicit) {
    action = 'BLOCK';
    confidence = 0.85 + Math.random() * 0.1;
    categories.push('adult_content');
    reasons.push('Explicit content detected');
  } else if (hasNegative) {
    action = 'WARN';
    confidence = 0.55 + Math.random() * 0.2;
    categories.push('harassment');
    reasons.push('Potentially aggressive language detected');
  } else {
    reasons.push('No policy violations detected');
  }

  return {
    action,
    confidence,
    categories,
    reasons,
    requestId: `mock-${Date.now()}`,
    classScores: {
      hate: hasNegative ? 0.4 + Math.random() * 0.3 : Math.random() * 0.1,
      violence: hasNegative ? 0.3 + Math.random() * 0.2 : Math.random() * 0.05,
      sexual: hasExplicit ? 0.9 : Math.random() * 0.02,
      harassment: hasNegative ? 0.5 + Math.random() * 0.2 : Math.random() * 0.08,
      spam: Math.random() * 0.1,
      self_harm: Math.random() * 0.02,
    },
    processingTimeMs: 50 + Math.random() * 100,
    isLive,
  };
}

// Register HTTP trigger
app.http('moderation_test', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'moderation/test',
  handler: moderation_test,
});
