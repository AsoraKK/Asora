import { v7 as uuidv7 } from 'uuid';
import { getCosmosDatabase } from '@shared/clients/cosmos';

export type AdminAuditAction =
  | 'CONTENT_BLOCK'
  | 'CONTENT_PUBLISH'
  | 'MODERATION_CASE_DECIDE'
  | 'MODERATION_WEIGHT_SAVE'
  | 'MODERATION_WEIGHT_RESET'
  | 'APPEAL_OVERRIDE'
  | 'APPEAL_APPROVE'
  | 'APPEAL_REJECT'
  | 'USER_DISABLE'
  | 'USER_ENABLE'
  | 'USER_TIER_SET'
  | 'INVITE_CREATE'
  | 'INVITE_BATCH_CREATE'
  | 'INVITE_REVOKE'
  | 'FLAG_RESOLVE'
  | 'NEWS_INGEST'
  | 'OPS_CHECKLIST_MODE_UPDATE'
  | 'BUDGET_UPDATE'
  | 'ADMIN_CONFIG_UPDATE'
  | 'TEST_DATA_PURGE'
  | 'MODERATION_TEST_PROXY';

export type AdminAuditTargetType =
  | 'content'
  | 'appeal'
  | 'user'
  | 'invite'
  | 'flag'
  | 'moderation_case'
  | 'config';

export type AdminAuditResult = 'success' | 'failure';

export interface AdminAuditIdentity {
  actorId: string;
  actorEmail: string | null;
  actorRole: string | null;
  requestId: string | null;
  clientIp: string | null;
  accessIdentity: string | null;
  correlationId: string | null;
  result: AdminAuditResult;
}

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
  requestId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  clientIp?: string | null;
  accessIdentity?: string | null;
  result?: AdminAuditResult;
  metadata?: Record<string, unknown> | null;
}

export interface AdminAuditRecord
  extends Omit<
    AdminAuditInput,
    'correlationId' | 'requestId' | 'actorEmail' | 'actorRole' | 'clientIp' | 'accessIdentity' | 'result'
  >,
    AdminAuditIdentity {
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
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    requestId: input.requestId ?? input.correlationId ?? null,
    clientIp: input.clientIp ?? null,
    accessIdentity: input.accessIdentity ?? null,
    correlationId: input.correlationId ?? input.requestId ?? null,
    result: input.result ?? 'success',
    ...input,
  };

  await container.items.create(record);
}
