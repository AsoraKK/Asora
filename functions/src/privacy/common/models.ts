export type DsrType = 'export' | 'delete';

export type DsrStatus =
  | 'queued'
  | 'running'
  | 'awaiting_review'
  | 'ready_to_release'
  | 'released'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface ReviewerRecord {
  by: string;
  at: string;
  notes?: string;
  pass?: boolean;
}

export interface ReviewProgress {
  reviewerA?: ReviewerRecord;
  reviewerB?: ReviewerRecord;
  approver?: ReviewerRecord;
}

export interface AuditEntry {
  at: string;
  by: string;
  event: string;
  meta?: Record<string, unknown>;
}

export interface DsrRequest {
  id: string;
  type: DsrType;
  userId: string;
  requestedBy: string;
  requestedAt: string;
  note?: string;
  startedAt?: string;
  completedAt?: string;
  status: DsrStatus;
  attempt: number;
  exportBlobPath?: string;
  exportBytes?: number;
  failureReason?: string;
  review: ReviewProgress;
  audit: AuditEntry[];
}

export interface LegalHold {
  id: string;
  scope: 'user' | 'post' | 'case';
  scopeId: string;
  reason: string;
  requestedBy: string;
  startedAt: string;
  expiresAt?: string;
  active: boolean;
  audit: Array<{
    at: string;
    by: string;
    event: 'placed' | 'cleared';
    note?: string;
  }>;
}

export interface ScoreCard {
  content_id: string;
  created_at: string;
  model_name: string;
  risk_score: number;
  label_set: string[];
  decision: 'allow' | 'flag' | 'block';
}

export interface ExportMediaLink {
  blobPath: string;
  sasUrl: string;
  expiresAt: string;
}

export interface DsrQueueMessage {
  id: string;
  type: DsrType;
  submittedAt: string;
}

export function createAuditEntry(params: {
  by: string;
  event: string;
  meta?: Record<string, unknown>;
}): AuditEntry {
  return {
    at: new Date().toISOString(),
    by: params.by,
    event: params.event,
    meta: params.meta,
  };
}
