import type { HttpRequest, InvocationContext } from '@azure/functions';

import { httpReqMock } from '../helpers/http';
import { appeals_create } from '../../src/appeals/appeals_create.function';
import { appeals_getById } from '../../src/appeals/appeals_getById.function';
import { appeals_vote } from '../../src/appeals/appeals_vote.function';
import { extractAuthContext } from '../../src/shared/http/authContext';
import { createAppeal, getAppealById, voteOnAppeal } from '../../src/appeals/appealsService';
import { HttpError } from '../../src/shared/utils/errors';

jest.mock('../../src/shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('../../src/appeals/appealsService', () => ({
  createAppeal: jest.fn(),
  getAppealById: jest.fn(),
  voteOnAppeal: jest.fn(),
}));

const mockedAuth = jest.mocked(extractAuthContext);
const mockedService = {
  createAppeal: jest.mocked(createAppeal),
  getAppealById: jest.mocked(getAppealById),
  voteOnAppeal: jest.mocked(voteOnAppeal),
};

const makeContext = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'appeal-test',
    functionName: 'appealTest',
    triggerMetadata: {},
    retryContext: {},
    extraInputs: {},
    extraOutputs: {},
    options: {},
  }) as unknown as InvocationContext;

const authResponse = {
  userId: 'user-appeal',
  roles: ['user'],
  tier: 'free',
  token: {},
};

describe('appeals routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue(authResponse);
  });

  it('creates an appeal successfully', async () => {
    const appeal = {
      id: 'appeal-1',
      caseId: 'case-1',
      authorId: 'user-appeal',
      statement: 'Please review',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockedService.createAppeal.mockResolvedValue(appeal);

    const response = await appeals_create(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { caseId: 'case-1', statement: 'Please review' },
      }),
      makeContext()
    );

    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual({ appeal });
  });

  it('returns 404 when creation is forbidden', async () => {
    mockedService.createAppeal.mockRejectedValue(new HttpError(404, 'Case not found'));

    const response = await appeals_create(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { caseId: 'case-1', statement: 'Please review' },
      }),
      makeContext()
    );

    expect(response.status).toBe(404);
  });

  it('fetches appeal details', async () => {
    const details = {
      appeal: {
        id: 'appeal-1',
        caseId: 'case-1',
        authorId: 'user-appeal',
        statement: 'Please review',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [],
      },
      votes: [],
      totalUpholdWeight: 0,
      totalDenyWeight: 0,
    };
    mockedService.getAppealById.mockResolvedValue(details);

    const response = await appeals_getById(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'appeal-1' },
      }),
      makeContext()
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(details);
  });

  it('returns 404 when appeal missing', async () => {
    mockedService.getAppealById.mockResolvedValue(null);

    const response = await appeals_getById(
      httpReqMock({
        method: 'GET',
        headers: { authorization: 'Bearer token' },
        params: { id: 'missing' },
      }),
      makeContext()
    );

    expect(response.status).toBe(404);
  });

  it('records a vote', async () => {
    const vote = {
      id: 'vote-1',
      appealId: 'appeal-1',
      userId: 'user-appeal',
      vote: 'uphold',
      weight: 1,
      createdAt: new Date().toISOString(),
    };
    mockedService.voteOnAppeal.mockResolvedValue(vote);

    const response = await appeals_vote(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'appeal-1' },
        body: { vote: 'uphold' },
      }),
      makeContext()
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ vote });
  });

  it('maps vote service HttpError to status', async () => {
    mockedService.voteOnAppeal.mockRejectedValue(new HttpError(400, 'already voted'));

    const response = await appeals_vote(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        params: { id: 'appeal-1' },
        body: { vote: 'deny' },
      }),
      makeContext()
    );

    expect(response.status).toBe(400);
  });
});
