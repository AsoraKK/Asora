import { v7 as uuidv7 } from 'uuid';
import { getCosmosDatabase } from '@shared/clients/cosmos';

export type AdminAuditAction =
  | 'CONTENT_BLOCK'
  | 'CONTENT_PUBLISH'
  | 'APPEAL_OVERRIDE'
  | 'APPEAL_APPROVE'
  | 'APPEAL_REJECT'
  | 'USER_DISABLE'
  | 'USER_ENABLE'
  | 'INVITE_CREATE'
  | 'INVITE_BATCH_CREATE'
  | 'INVITE_REVOKE'
  | 'FLAG_RESOLVE';

export type AdminAuditTargetType = 'content' | 'appeal' | 'user' | 'invite' | 'flag';

export interface AdminAuditInput {
  actorId: string;
  action: AdminAuditAction;
  subjectId: string;
  targetType: AdminAuditTargetType;
  reasonCode: string;
  note?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AdminAuditRecord extends AdminAuditInput {
  id: string;
  timestamp: string;
  eventType: AdminAuditAction;
}

export async function recordAdminAudit(input: AdminAuditInput): Promise<void> {
  const database = getCosmosDatabase();
  const container = database.container('audit_logs');

  const record: AdminAuditRecord = {
    id: uuidv7(),
    timestamp: new Date().toISOString(),
    eventType: input.action,
    ...input,
  };

  await container.items.create(record);
}
