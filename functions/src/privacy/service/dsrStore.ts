import type { Container, SqlParameter } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { isNotFoundError } from '@shared/errorUtils';
import { v4 as uuidv4 } from 'uuid';

import type { AuditEntry, DsrRequest, DsrStatus, DsrType, LegalHold } from '../common/models';

export interface ListDsrFilters {
  type?: DsrType | null;
  statuses?: DsrStatus[];
  fromDate?: string | null;
  toDate?: string | null;
  userId?: string | null;
  limit: number;
  continuationToken?: string;
}

export interface ListDsrResult {
  items: DsrRequest[];
  continuationToken?: string;
}

const database = getCosmosDatabase();

function getContainer(name: string): Container {
  return database.container(name);
}

const requestsContainer = getContainer('privacy_requests');
const legalHoldContainer = getContainer('legal_holds');
const auditContainer = getContainer('audit_logs');

export async function getDsrRequest(id: string): Promise<DsrRequest | null> {
  try {
    const { resource } = await requestsContainer.item(id, id).read();
    return resource ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createDsrRequest(request: DsrRequest): Promise<void> {
  await requestsContainer.items.create(request);
}

export async function listDsrRequests(filters: ListDsrFilters): Promise<ListDsrResult> {
  const conditions: string[] = [];
  const parameters: SqlParameter[] = [];

  if (filters.type) {
    conditions.push('c.type = @type');
    parameters.push({ name: '@type', value: filters.type });
  }

  if (filters.statuses && filters.statuses.length > 0) {
    // Use ARRAY_CONTAINS for multiple status values
    conditions.push('ARRAY_CONTAINS(@statuses, c.status)');
    parameters.push({ name: '@statuses', value: filters.statuses });
  }

  if (filters.fromDate) {
    conditions.push('c.requestedAt >= @fromDate');
    parameters.push({ name: '@fromDate', value: filters.fromDate });
  }

  if (filters.toDate) {
    conditions.push('c.requestedAt <= @toDate');
    parameters.push({ name: '@toDate', value: filters.toDate });
  }

  if (filters.userId) {
    conditions.push('c.userId = @userId');
    parameters.push({ name: '@userId', value: filters.userId });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM c ${whereClause} ORDER BY c.requestedAt DESC`;

  const iterator = requestsContainer.items.query(
    { query, parameters },
    {
      maxItemCount: filters.limit,
      continuationToken: filters.continuationToken,
    },
  );

  const { resources, continuationToken } = await iterator.fetchNext();
  return {
    items: resources as DsrRequest[],
    continuationToken: continuationToken ?? undefined,
  };
}

export async function patchDsrRequest(
  id: string,
  updates: Partial<DsrRequest>,
  auditEntry?: AuditEntry,
): Promise<DsrRequest> {
  const existing = await getDsrRequest(id);
  if (!existing) {
    throw new Error(`DSR request ${id} not found`);
  }

  const next: DsrRequest = {
    ...existing,
    ...updates,
    review: { ...existing.review, ...updates.review },
    audit:
      auditEntry !== undefined
        ? [...(existing.audit ?? []), auditEntry]
        : existing.audit ?? [],
  };

  const { resource } = await requestsContainer.item(id, id).replace(next);
  if (auditEntry) {
    await auditContainer.items.create({
      id: uuidv4(),
      requestId: id,
      ...auditEntry,
    });
  }

  return resource as DsrRequest;
}

export async function hasLegalHold(scope: string, scopeId: string): Promise<boolean> {
  const { resources } = await legalHoldContainer.items
    .query({
      query:
        'SELECT TOP 1 * FROM c WHERE c.scope = @scope AND c.scopeId = @scopeId AND c.active = true',
      parameters: [
        { name: '@scope', value: scope },
        { name: '@scopeId', value: scopeId },
      ],
    })
    .fetchAll();

  return resources.length > 0;
}

export async function listLegalHolds(scopeId: string): Promise<LegalHold[]> {
  const { resources } = await legalHoldContainer.items
    .query({
      query: 'SELECT * FROM c WHERE c.scopeId = @scopeId',
      parameters: [{ name: '@scopeId', value: scopeId }],
    })
    .fetchAll();
  return resources;
}

export async function placeLegalHold(hold: LegalHold): Promise<void> {
  await legalHoldContainer.items.create(hold);
}

export async function clearLegalHold(id: string): Promise<void> {
  const { resource } = await legalHoldContainer.item(id, id).read();
  if (!resource) {
    return;
  }
  await legalHoldContainer.item(id, id).replace({
    ...resource,
    active: false,
    audit: [
      ...(resource.audit ?? []),
      {
        at: new Date().toISOString(),
        by: 'system',
        event: 'cleared',
      },
    ],
  });
}
