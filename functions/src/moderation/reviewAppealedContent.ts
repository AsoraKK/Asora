import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireModerator } from '@shared/middleware/auth';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import type { Principal } from '@shared/middleware/auth';
import {
  handleCorsAndMethod,
  ok,
  badRequest,
  notFound,
  serverError,
} from '@shared/utils/http';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import type { AuthorshipLabel } from '@shared/authorship';
import { finalizeAppealDecision } from '@moderation/service/voteService';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type AuthenticatedRequest = HttpRequest & { principal: Principal };

type ReviewDecision = 'approved' | 'rejected';

interface ReviewAppealBody {
  decision: ReviewDecision;
  reason: string;
  notes?: string;
  finalLabel?: Exclude<AuthorshipLabel, 'Under review'>;
}

interface AppealDocument {
  id: string;
  status: string;
  contentId?: string;
  contentType?: string;
  reporterId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────

function isValidDecision(value: unknown): value is ReviewDecision {
  return value === 'approved' || value === 'rejected';
}

function isFinalLabel(value: unknown): value is Exclude<AuthorshipLabel, 'Under review'> {
  return (
    value === 'Human-authored' ||
    value === 'AI-assisted' ||
    value === 'AI-generated'
  );
}

function validateBody(body: unknown): { valid: true; data: ReviewAppealBody } | { valid: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  if (!isValidDecision(b.decision)) {
    return { valid: false, error: 'decision must be "approved" or "rejected"' };
  }

  if (typeof b.reason !== 'string' || b.reason.trim().length < 1) {
    return { valid: false, error: 'reason is required' };
  }
  if (b.reason.length > 500) {
    return { valid: false, error: 'reason must be 500 characters or fewer' };
  }

  if (b.notes !== undefined) {
    if (typeof b.notes !== 'string') {
      return { valid: false, error: 'notes must be a string if provided' };
    }
    if (b.notes.length > 1000) {
      return { valid: false, error: 'notes must be 1000 characters or fewer' };
    }
  }
  if (b.finalLabel !== undefined && !isFinalLabel(b.finalLabel)) {
    return {
      valid: false,
      error: 'finalLabel must be "Human-authored", "AI-assisted", or "AI-generated"',
    };
  }

  return {
    valid: true,
    data: {
      decision: b.decision,
      reason: b.reason.trim(),
      notes: typeof b.notes === 'string' ? b.notes.trim() : undefined,
      finalLabel: isFinalLabel(b.finalLabel) ? b.finalLabel : undefined,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Protected handler
// ─────────────────────────────────────────────────────────────

const protectedReviewAppealedContent = requireModerator(
  async (req: AuthenticatedRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const appealId = req.params['appealId'];
    if (!appealId || typeof appealId !== 'string') {
      return badRequest('appealId route parameter is required');
    }

    // Parse request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }

    const validation = validateBody(rawBody);
    if (!validation.valid) {
      return badRequest(validation.error);
    }
    const { decision, reason, notes, finalLabel } = validation.data;

    const moderatorId = req.principal.sub;
    context.log('moderation.reviewAppealedContent.start', { appealId, decision, moderatorId });

    try {
      const database = getCosmosDatabase();
      const appealsContainer = database.container('appeals');

      // Fetch the appeal document
      let appeal: AppealDocument;
      try {
        const { resource } = await appealsContainer.item(appealId, appealId).read<AppealDocument>();
        if (!resource) {
          return notFound();
        }
        appeal = resource;
      } catch (err: unknown) {
        const cosmosErr = err as { code?: number };
        if (cosmosErr.code === 404) {
          return notFound();
        }
        throw err;
      }

      // Only pending appeals can be reviewed
      if (appeal.status !== 'pending') {
        return badRequest(`Appeal is already in status "${appeal.status}" and cannot be reviewed`);
      }

      if (appeal.contentType === 'post' && !finalLabel) {
        return badRequest('finalLabel is required when adjudicating a post appeal');
      }

      const now = new Date().toISOString();

      await finalizeAppealDecision({
        database,
        appealDoc: appeal,
        context,
        decision,
        actorId: moderatorId,
        reason: notes ? `${reason}: ${notes}` : reason,
        finalLabel,
      });
      await appealsContainer.items.upsert(appeal);

      context.log('moderation.reviewAppealedContent.success', {
        appealId,
        decision,
        moderatorId,
        finalLabel: finalLabel ?? null,
      });

      return ok({
        appealId,
        decision,
        resolvedAt: now,
        finalLabel: finalLabel ?? null,
        communityRecommendation: appeal.communityRecommendation ?? null,
      });
    } catch (error) {
      context.log('moderation.reviewAppealedContent.error', {
        appealId,
        message: (error as Error).message,
      });
      return serverError();
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Route handler (CORS wrapper)
// ─────────────────────────────────────────────────────────────

export async function reviewAppealedContentRoute(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  return protectedReviewAppealedContent(req, context);
}

// ─────────────────────────────────────────────────────────────
// Function registration
// ─────────────────────────────────────────────────────────────

const rateLimitedReviewAppeal = withRateLimit(
  reviewAppealedContentRoute,
  (req, context) => getPolicyForFunction('moderation-review-appeal'),
);

app.http('moderation-review-appeal', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'moderation/appeals/{appealId}/review',
  handler: rateLimitedReviewAppeal,
});
