import type { InvocationContext } from '@azure/functions';

import { httpReqMock } from '../../../tests/helpers/http';

const mockAppHttp = jest.fn();
const mockRequireModerator = jest.fn((handler: any) => handler);
const mockWithRateLimit = jest.fn((handler: any) => handler);

jest.mock('@azure/functions', () => ({
  app: { http: mockAppHttp },
}));

jest.mock('@auth/requireRoles', () => ({
  requireModerator: mockRequireModerator,
}));

jest.mock('@http/withRateLimit', () => ({
  withRateLimit: mockWithRateLimit,
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@moderation/moderationService', () => ({
  createModerationDecision: jest.fn(),
  hasModeratorRole: jest.requireActual('@moderation/moderationService').hasModeratorRole,
}));

import { extractAuthContext } from '@shared/http/authContext';
import { createModerationDecision } from '@moderation/moderationService';
import { moderation_cases_decide } from './moderation_cases_decide.function';

const extractAuthContextMock = jest.mocked(extractAuthContext);
const createModerationDecisionMock = jest.mocked(createModerationDecision);

const contextStub = {
  invocationId: 'test-moderation-decide',
  correlationId: 'moderation-correlation',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  context: {
    log: jest.fn(),
    error: jest.fn(),
  },
} as unknown as InvocationContext;

describe('moderation_cases_decide', () => {
  it('registers the POST route behind the moderator guard', () => {
    expect(mockRequireModerator).toHaveBeenCalledTimes(1);
    expect(mockWithRateLimit).toHaveBeenCalledTimes(1);
    expect(mockAppHttp).toHaveBeenCalledWith(
      'moderation_cases_decide',
      expect.objectContaining({
        authLevel: 'anonymous',
        methods: ['POST'],
        route: 'moderation/cases/{id}/decision',
      })
    );
  });

  it('returns 401 before body validation when auth is missing', async () => {
    extractAuthContextMock.mockRejectedValue(new Error('Missing Authorization header'));

    const response = await moderation_cases_decide(
      httpReqMock({
        method: 'POST',
        params: { id: 'case-1' },
      }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(createModerationDecisionMock).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller is not a moderator', async () => {
    extractAuthContextMock.mockResolvedValue({
      userId: 'user-1',
      roles: ['user'],
      tier: 'free',
      token: {},
    });

    const response = await moderation_cases_decide(
      httpReqMock({
        method: 'POST',
        params: { id: 'case-1' },
        body: { action: 'approve', rationale: 'Looks fine' },
      }),
      contextStub
    );

    expect(response.status).toBe(403);
    expect(createModerationDecisionMock).not.toHaveBeenCalled();
  });

  it('accepts moderator or admin roles for decisions', async () => {
    extractAuthContextMock.mockResolvedValue({
      userId: 'admin-1',
      roles: ['admin'],
      tier: 'premium',
      token: {},
    });
    createModerationDecisionMock.mockResolvedValue({
      id: 'decision-1',
      caseId: 'case-1',
      userId: 'admin-1',
      action: 'approve',
      rationale: 'Reviewed',
      createdAt: '2026-06-11T00:00:00.000Z',
    } as any);

    const response = await moderation_cases_decide(
      httpReqMock({
        method: 'POST',
        params: { id: 'case-1' },
        body: { action: 'approve', rationale: 'Reviewed' },
      }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect(createModerationDecisionMock).toHaveBeenCalledWith(
      'case-1',
      'admin-1',
      'approve',
      'Reviewed'
    );
  });
});
