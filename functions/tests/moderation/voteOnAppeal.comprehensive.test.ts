import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

const appealsFetchAll = jest.fn();
const appealsReplace = jest.fn();
const votesFetchAll = jest.fn();
const votesCreate = jest.fn();
const usersRead = jest.fn();
const postsRead = jest.fn();
const postsReplace = jest.fn();
const moderationDecisionsCreate = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
	getCosmosDatabase: jest.fn(() => ({
		container: jest.fn((name: string) => {
			if (name === 'appeals') {
				return {
					items: {
						query: jest.fn((query: { query: string }) => ({
							fetchAll: jest.fn(async () => {
								void query;
								return appealsFetchAll();
							}),
						})),
					},
					item: jest.fn(() => ({ replace: appealsReplace })),
				};
			}

			if (name === 'appeal_votes') {
				return {
					items: {
						query: jest.fn((query: { query: string }) => ({
							fetchAll: jest.fn(async () => votesFetchAll(query)),
						})),
						create: votesCreate,
					},
				};
			}

			if (name === 'users') {
				return {
					item: jest.fn(() => ({ read: usersRead })),
				};
			}

			if (name === 'posts') {
				return {
					item: jest.fn(() => ({ read: postsRead, replace: postsReplace })),
					items: { query: jest.fn() },
				};
			}

			if (name === 'moderation_decisions') {
				return {
					items: { create: moderationDecisionsCreate },
				};
			}

			return { items: { query: jest.fn(), create: jest.fn() } };
		}),
	})),
}));

jest.mock('@auth/service/usersService', () => ({
	usersService: {
		getUserById: jest.fn(),
	},
}));

jest.mock('@shared/services/reputationService', () => ({
	penalizeContentRemoval: jest.fn(),
}));

jest.mock('@shared/services/receiptEvents', () => ({
	appendReceiptEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@shared/services/notificationEvents', () => ({
	enqueueUserNotification: jest.fn().mockResolvedValue(undefined),
}));

const { usersService } = require('@auth/service/usersService') as {
	usersService: { getUserById: jest.Mock };
};
const { appendReceiptEvent } = require('@shared/services/receiptEvents') as {
	appendReceiptEvent: jest.Mock;
};
const { enqueueUserNotification } = require('@shared/services/notificationEvents') as {
	enqueueUserNotification: jest.Mock;
};
const { voteOnAppealHandler } = require('@moderation/service/voteService') as typeof import('../../src/moderation/service/voteService');

const contextStub = {
	invocationId: 'vote-comprehensive',
	log: jest.fn(),
	error: jest.fn(),
} as unknown as InvocationContext;

function createAppeal(overrides: Record<string, unknown> = {}) {
	return {
		id: 'appeal-1',
		contentId: 'post-1',
		contentType: 'post',
		status: 'pending',
		submitterId: 'submitter-1',
		appealReason: 'This was incorrectly blocked',
		votesFor: 0,
		votesAgainst: 0,
		requiredVotes: 3,
		expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
		flagCount: 1,
		urgencyScore: 6,
		...overrides,
	};
}

function mockVoteQueries(options?: {
	appeal?: Record<string, unknown>;
	existingVotes?: unknown[];
	dailyCount?: number;
}) {
	appealsFetchAll.mockResolvedValue({ resources: [options?.appeal ?? createAppeal()] });
	votesFetchAll.mockImplementation(async (query: { query: string }) => {
		if (query.query.includes('COUNT(1)')) {
			return { resources: [options?.dailyCount ?? 0] };
		}
		return { resources: options?.existingVotes ?? [] };
	});
}

function createRequest(body: Record<string, unknown>, appealId = 'appeal-1') {
	return httpReqMock({
		method: 'POST',
		params: { appealId },
		body,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	contextStub.log = jest.fn();
	contextStub.error = jest.fn();

	appealsReplace.mockResolvedValue({});
	votesCreate.mockResolvedValue({ resource: { id: 'vote-1' } });
	usersRead.mockResolvedValue({ resource: { name: 'Test moderator' } });
	postsRead.mockResolvedValue({ resource: { id: 'post-1', authorId: 'author-1', status: 'blocked' } });
	postsReplace.mockResolvedValue({});
	moderationDecisionsCreate.mockResolvedValue({ resource: { id: 'decision-1' } });
	usersService.getUserById.mockResolvedValue({ reputation_score: 0 });
});

describe('voteOnAppealHandler comprehensive coverage', () => {
	it('returns 400 when no appeal id is provided', async () => {
		mockVoteQueries();

		const response = await voteOnAppealHandler({
			request: createRequest({ vote: 'approve', reason: 'Long enough reason' }, undefined as any),
			context: contextStub,
			userId: 'moderator-1',
			claims: { roles: ['moderator'] } as any,
		});

		expect(response.status).toBe(400);
		expect((response.jsonBody as any).error).toContain('Appeal ID is required');
	});

	it('returns 403 when the user votes on their own appeal', async () => {
		mockVoteQueries({ appeal: createAppeal({ submitterId: 'moderator-1' }) });

		const response = await voteOnAppealHandler({
			request: createRequest({ vote: 'approve', reason: 'This is a sufficiently long reason' }),
			context: contextStub,
			userId: 'moderator-1',
			claims: { roles: ['moderator'] } as any,
			appealId: 'appeal-1',
		});

		expect(response.status).toBe(403);
		expect((response.jsonBody as any).error).toBe('You cannot vote on your own appeal');
		expect(votesCreate).not.toHaveBeenCalled();
	});

	it('returns 429 when the daily vote limit is reached', async () => {
		mockVoteQueries({ dailyCount: 25 });

		const response = await voteOnAppealHandler({
			request: createRequest({ vote: 'approve', reason: 'This is a sufficiently long reason' }),
			context: contextStub,
			userId: 'moderator-1',
			claims: { roles: ['moderator'] } as any,
			appealId: 'appeal-1',
		});

		expect(response.status).toBe(429);
		expect((response.jsonBody as any).error).toBe('Daily voting limit reached');
		expect(usersRead).not.toHaveBeenCalled();
	});

	it('records a vote, reaches quorum, and resolves the appeal', async () => {
		const appeal = createAppeal({ requiredVotes: 3, votesFor: 0, votesAgainst: 0 });
		mockVoteQueries({ appeal, dailyCount: 0 });
		usersService.getUserById.mockResolvedValue({ reputation_score: 0 });

		const response = await voteOnAppealHandler({
			request: createRequest({
				vote: 'approve',
				reason: 'The evidence shows this was incorrectly blocked',
				confidence: 9,
				notes: 'Reviewed manually',
			}),
			context: contextStub,
			userId: 'admin-1',
			claims: { roles: ['admin'] } as any,
			appealId: 'appeal-1',
		});

		expect(response.status).toBe(200);
		expect((response.jsonBody as any).finalDecision).toBe('approved');
		expect((response.jsonBody as any).currentTally).toMatchObject({
			votesFor: 3,
			votesAgainst: 0,
			totalVotes: 3,
			requiredVotes: 3,
			hasReachedQuorum: true,
		});
		expect(votesCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				appealId: 'appeal-1',
				voterId: 'admin-1',
				vote: 'approve',
				weight: 3,
				isModerator: true,
			})
		);
		expect(postsReplace).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'post-1',
				status: 'published',
				appealStatus: 'approved',
			})
		);
		expect(moderationDecisionsCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'approved',
				appealId: 'appeal-1',
				source: 'appeal_vote',
			})
		);
		expect(appendReceiptEvent).toHaveBeenCalled();
		expect(enqueueUserNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'submitter-1',
				eventType: expect.any(String),
			})
		);
	});

	it('returns 409 and resolves expired appeals before recording the vote', async () => {
		const expiredAppeal = createAppeal({
			votesFor: 1,
			votesAgainst: 2,
			requiredVotes: 3,
			expiresAt: new Date(Date.now() - 60_000).toISOString(),
		});
		mockVoteQueries({ appeal: expiredAppeal, dailyCount: 0 });

		const response = await voteOnAppealHandler({
			request: createRequest({ vote: 'reject', reason: 'This is a sufficiently long reason' }),
			context: contextStub,
			userId: 'moderator-2',
			claims: { roles: ['moderator'] } as any,
			appealId: 'appeal-1',
		});

		expect(response.status).toBe(409);
		expect((response.jsonBody as any).error).toBe('Appeal has expired');
		expect((response.jsonBody as any).finalDecision).toBe('rejected');
		expect(appealsReplace).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'rejected',
				finalDecision: 'rejected',
				resolvedBy: 'community_vote',
			})
		);
		expect(votesCreate).not.toHaveBeenCalled();
		expect(moderationDecisionsCreate).toHaveBeenCalled();
	});
});
