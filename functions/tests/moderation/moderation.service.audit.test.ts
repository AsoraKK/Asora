jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

jest.mock('@admin/auditLogger', () => ({
  recordAdminAudit: jest.fn(),
}));

const { getTargetDatabase } = require('@shared/clients/cosmos');
const { recordAdminAudit } = require('@admin/auditLogger');
const { createModerationDecision } = require('../../src/moderation/moderationService');

describe('moderationService audit logging', () => {
  const create = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    create.mockResolvedValue({ resource: {} });
    getTargetDatabase.mockReturnValue({
      moderationDecisions: {
        items: {
          create,
        },
      },
    });
    recordAdminAudit.mockResolvedValue(undefined);
  });

  it('writes audit log for approve decision', async () => {
    const decision = await createModerationDecision('case-1', 'moderator-1', 'approve', 'looks safe');

    expect(create).toHaveBeenCalledTimes(1);
    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'moderator-1',
        action: 'MODERATION_CASE_DECIDE',
        subjectId: 'case-1',
        targetType: 'moderation_case',
        reasonCode: 'MODERATION_APPROVE',
      })
    );
    expect(decision.action).toBe('approve');
  });

  it('creates an append-only moderation_decisions record with the expected schema', async () => {
    await createModerationDecision('case-4', 'moderator-4', 'reject', 'policy violation');

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      caseId: 'case-4',
      itemId: 'case-4',
      contentId: 'case-4',
      contentType: 'post',
      action: 'reject',
      actorId: 'moderator-4',
      userId: 'moderator-4',
      partitionKey: 'case-4',
      metadata: {
        reason: 'policy violation',
        severity: 'medium',
      },
    });
    expect(create.mock.calls[0][0].id).toBeDefined();
    expect(create.mock.calls[0][0].decidedAt).toBeDefined();
    expect(create.mock.calls[0][0].createdAt).toBeDefined();
    expect(recordAdminAudit).toHaveBeenCalledTimes(1);
  });

  it('writes audit log for reject decision', async () => {
    await createModerationDecision('case-2', 'moderator-2', 'reject', 'policy violation');

    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonCode: 'MODERATION_REJECT',
      })
    );
  });

  it('writes audit log for escalate decision', async () => {
    await createModerationDecision('case-3', 'moderator-3', 'escalate', 'needs senior review');

    expect(recordAdminAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        reasonCode: 'MODERATION_ESCALATE',
      })
    );
  });
});
