import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Appeals from './Appeals.jsx';
import { adminRequest } from '../api/adminApi.js';

vi.mock('../api/adminApi.js', () => ({
  adminRequest: vi.fn(),
}));

describe('Appeals page', () => {
  beforeEach(() => {
    adminRequest.mockReset();
  });

  it('submits a moderator override with an idempotency key', async () => {
    adminRequest.mockImplementation((path) => {
      if (path === '_admin/appeals') {
        return Promise.resolve({
          items: [
            {
              appealId: 'appeal-123',
              contentId: 'post-123',
              authorId: 'user-1',
              submittedAt: '2024-01-01T00:00:00Z',
              status: 'pending',
              originalReasonCategory: 'spam',
              votesFor: 2,
              votesAgainst: 1,
              totalVotes: 3,
              timeRemainingSeconds: 120,
              expiresAt: '2024-01-01T00:05:00Z',
            },
          ],
          nextCursor: null,
        });
      }
      if (path === '_admin/appeals/appeal-123') {
        return Promise.resolve({
          appealId: 'appeal-123',
          targetType: 'post',
          targetId: 'post-123',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00Z',
          lastUpdatedAt: '2024-01-01T00:01:00Z',
          votes: { for: 2, against: 1, total: 3 },
          quorum: { required: 3, reached: true },
          moderatorOverrideAllowed: true,
          finalDecision: null,
          auditSummary: {
            lastActorRole: 'community',
            lastAction: 'appeal_submitted',
            lastActionAt: '2024-01-01T00:00:00Z',
          },
          appeal: {
            appealId: 'appeal-123',
            contentId: 'post-123',
            submittedAt: '2024-01-01T00:00:00Z',
            status: 'pending',
            appealType: 'false_positive',
            appealReason: 'False positive',
            userStatement: 'This is my statement.',
            evidenceUrls: [],
            votesFor: 2,
            votesAgainst: 1,
            totalVotes: 3,
            timeRemainingSeconds: 120,
            expiresAt: '2024-01-01T00:05:00Z',
          },
          content: {
            contentId: 'post-123',
            type: 'post',
            createdAt: '2024-01-01T00:00:00Z',
            preview: 'Preview',
          },
        });
      }
      if (path === '_admin/appeals/appeal-123/override') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    await act(async () => {
      render(<Appeals />);
    });

    await waitFor(() => expect(adminRequest).toHaveBeenCalled());

    const openButton = await screen.findByRole('button', { name: 'Open' });
    await act(async () => {
      await user.click(openButton);
    });

    await screen.findByText('Vote tally');
    const overrideButton = await screen.findByRole('button', { name: 'Moderator Override' });
    await act(async () => {
      await user.click(overrideButton);
    });

    await act(async () => {
      await user.selectOptions(screen.getByLabelText('Reason'), 'policy_exception');
      await user.click(screen.getByRole('button', { name: 'Confirm Override' }));
    });

    await waitFor(() =>
      expect(adminRequest).toHaveBeenCalledWith(
        '_admin/appeals/appeal-123/override',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
          body: expect.objectContaining({
            decision: 'allow',
            reasonCode: 'policy_exception',
          }),
        })
      )
    );

    await waitFor(() => expect(adminRequest).toHaveBeenCalledTimes(4));
  });
});
