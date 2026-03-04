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
