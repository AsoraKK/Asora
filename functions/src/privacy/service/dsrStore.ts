import type { Container } from '@azure/cosmos';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { v7 as uuidv7 } from 'uuid';

import type { AuditEntry, DsrRequest, LegalHold } from '../common/models';

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
  } catch (error: any) {
    if (error?.code === 404) {
      return null;
    }
    throw error;
  }
}

export async function createDsrRequest(request: DsrRequest): Promise<void> {
  await requestsContainer.items.create(request);
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
      id: uuidv7(),
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
