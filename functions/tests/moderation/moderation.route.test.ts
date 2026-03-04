import type { HttpRequest, InvocationContext } from '@azure/functions';

import { httpReqMock } from '../helpers/http';
import { moderation_queue_list } from '../../src/moderation/routes/moderation_queue_list.function';
import { moderation_cases_getById } from '../../src/moderation/routes/moderation_cases_getById.function';
import { moderation_cases_decide } from '../../src/moderation/routes/moderation_cases_decide.function';
import { extractAuthContext } from '../../src/shared/http/authContext';
import {
  getModerationCaseById,
  createModerationDecision,
  hasModeratorRole,
} from '../../src/moderation/moderationService';
import { getReviewQueueHandler } from '../../src/moderation/service/reviewQueueService';

jest.mock('../../src/shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('../../src/moderation/service/reviewQueueService', () => ({
  getReviewQueueHandler: jest.fn(),
}));

jest.mock('../../src/moderation/moderationService', () => ({
  getModerationCaseById: jest.fn(),
  createModerationDecision: jest.fn(),
  hasModeratorRole: jest.fn(),
}));

const mockedAuth = jest.mocked(extractAuthContext);
const mockedReviewQueue = jest.mocked(getReviewQueueHandler);
const mockedModerationService = {
  getModerationCaseById: jest.mocked(getModerationCaseById),
  createModerationDecision: jest.mocked(createModerationDecision),
  hasModeratorRole: jest.mocked(hasModeratorRole),
};

const makeContext = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-id',
    functionName: 'moderationTest',
    triggerMetadata: {},
    retryContext: {},
    extraInputs: {},
    extraOutputs: {},
    options: {},
  }) as unknown as InvocationContext;

const authResponse = {
  userId: 'editor',
  roles: ['moderator'],
  tier: 'free',
  token: {},
};

describe('moderation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(authResponse);
    mockedModerationService.hasModeratorRole.mockReturnValue(true);
  });

  it('returns 403 for queue when user lacks moderator role', async () => {
    mockedModerationService.hasModeratorRole.mockReturnValue(false);
    const response = await moderation_queue_list(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
      }),
      makeContext()
    );

    expect(response.status).toBe(403);
  });

  it('calls review queue handler when authorized', async () => {
    mockedReviewQueue.mockResolvedValue({
      status: 200,
      jsonBody: { items: [], nextCursor: null, continuationToken: null, totalCount: 0, hasMore: false },
    });

    const response = await moderation_queue_list(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        query: { limit: '15', cursor: 'abc' },
      }),
      makeContext()
    );

    expect(mockedReviewQueue).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 15, continuationToken: 'abc' })
    );
    expect(response.status).toBe(200);
  });

  it('returns case data when found', async () => {
    mockedModerationService.getModerationCaseById.mockResolvedValue({
      case: {
        id: 'case-1',
        targetId: 'post-1',
        targetType: 'post',
        reason: 'spam',
        reporterIds: [],
        status: 'pending',
        severity: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      decisions: [],
    });

    const response = await moderation_cases_getById(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-1' },
      }),
      makeContext()
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toHaveProperty('case');
  });

  it('returns 404 when case missing', async () => {
    mockedModerationService.getModerationCaseById.mockResolvedValue(null);
    const response = await moderation_cases_getById(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-x' },
      }),
      makeContext()
    );

    expect(response.status).toBe(404);
  });

  it('submits a decision when authorized', async () => {
    const decision = {
      id: 'decision-1',
      caseId: 'case-1',
      userId: 'editor',
      action: 'approve',
      createdAt: new Date().toISOString(),
    };

    mockedModerationService.createModerationDecision.mockResolvedValue(decision);

    const response = await moderation_cases_decide(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-1' },
        body: { action: 'approve' },
      }),
      makeContext()
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(decision);
  });

  it('rejects invalid actions', async () => {
    const response = await moderation_cases_decide(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'case-1' },
        body: { action: 'invalid' },
      }),
      makeContext()
    );

    expect(response.status).toBe(400);
  });
});
