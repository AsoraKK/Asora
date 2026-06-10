import type { InvocationContext } from '@azure/functions';

import { httpReqMock } from '../helpers/http';
import { moderation_cases_decide } from '../../src/moderation/routes/moderation_cases_decide.function';
import { AuthError, verifyAuthorizationHeader } from '@auth/verifyJwt';
import { requireModerator } from '../../src/auth/requireRoles';
import { extractAuthContext } from '../../src/shared/http/authContext';
import { createModerationDecision } from '../../src/moderation/moderationService';
import { withRateLimit } from '../../src/http/withRateLimit';
import { getPolicyForRoute } from '../../src/rate-limit/policies';

jest.mock('../../src/shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

jest.mock('../../src/moderation/moderationService', () => ({
  createModerationDecision: jest.fn(),
  hasModeratorRole: jest.fn(() => true),
  getModerationCaseById: jest.fn(),
}));

const mockedAuthContext = jest.mocked(extractAuthContext);
const mockedVerifyAuth = jest.mocked(verifyAuthorizationHeader);
const mockedDecision = jest.mocked(createModerationDecision);
const protectedModerationCasesDecide = requireModerator(
  withRateLimit(moderation_cases_decide, (req) => getPolicyForRoute(req)) as any
);

const contextStub = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  traceContext: {},
  invocationId: 'moderation-decision-test',
  functionName: 'moderationCasesDecideTest',
  triggerMetadata: {},
  retryContext: {},
  extraInputs: {},
  extraOutputs: {},
  options: {},
} as unknown as InvocationContext;

const authResponse = {
  userId: 'mod-1',
  roles: ['moderator'],
  tier: 'free',
  token: {},
};

describe('moderation_cases_decide route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuthContext.mockResolvedValue(authResponse);
    mockedVerifyAuth.mockResolvedValue({
      sub: authResponse.userId,
      roles: authResponse.roles,
      tier: authResponse.tier,
      raw: {},
    } as any);
  });

  it('creates a moderation decision for an authorized moderator', async () => {
    const decision = {
      id: 'decision-1',
      caseId: 'case-1',
      moderatorId: 'mod-1',
      action: 'approve',
      rationale: 'meets policy',
      createdAt: new Date().toISOString(),
    };

    mockedDecision.mockResolvedValue(decision as any);

    const response = await protectedModerationCasesDecide(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-1' },
        body: { action: 'approve', rationale: 'meets policy' },
      }),
      contextStub
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(decision);
    expect(mockedDecision).toHaveBeenCalledWith('case-1', 'mod-1', 'approve', 'meets policy');
  });

  it('blocks guest decisions before the handler runs', async () => {
    mockedVerifyAuth.mockRejectedValueOnce(new AuthError('invalid_request', 'Authorization header missing'));

    const response = await protectedModerationCasesDecide(
      httpReqMock({
        method: 'POST',
        params: { id: 'case-1' },
        body: { action: 'approve', rationale: 'meets policy' },
      }),
      contextStub
    );

    expect(response.status).toBe(401);
    expect(mockedDecision).not.toHaveBeenCalled();
  });

  it('blocks non-moderators before the handler runs', async () => {
    mockedVerifyAuth.mockResolvedValueOnce({
      sub: 'user-2',
      roles: ['user'],
      tier: 'free',
      raw: {},
    } as any);

    const response = await protectedModerationCasesDecide(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-1' },
        body: { action: 'reject', rationale: 'not enough evidence' },
      }),
      contextStub
    );

    expect(response.status).toBe(403);
    expect(mockedDecision).not.toHaveBeenCalled();
  });
});
