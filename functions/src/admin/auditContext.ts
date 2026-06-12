import type { HttpRequest, InvocationContext } from '@azure/functions';

import type { Principal } from '@shared/middleware/auth';

import type { AdminAuditIdentity } from './auditLogger';

type AdminRequest = HttpRequest & { principal?: Principal & { role?: string | string[] } };

function normalizeRole(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return first?.trim() ?? null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

export function getRequestClientIp(request: HttpRequest): string | null {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
}

export function getPrincipalRole(principal: Principal | undefined | null): string | null {
  if (!principal) {
    return null;
  }

  const role = normalizeRole(principal.roles);
  if (role) {
    return role;
  }

  return normalizeRole((principal as Principal & { role?: unknown }).role);
}

export function buildAdminAuditIdentity(
  request: HttpRequest,
  context: InvocationContext,
  overrides: Partial<AdminAuditIdentity> = {},
): AdminAuditIdentity {
  const adminRequest = request as AdminRequest;
  const principal = adminRequest.principal;

  const requestId = overrides.requestId ?? context.invocationId ?? null;

  return {
    actorId: overrides.actorId ?? principal?.sub ?? 'unknown',
    actorEmail: overrides.actorEmail ?? principal?.email ?? null,
    actorRole: overrides.actorRole ?? getPrincipalRole(principal),
    clientIp: overrides.clientIp ?? getRequestClientIp(request),
    accessIdentity: overrides.accessIdentity ?? null,
    requestId,
    correlationId: requestId,
    result: overrides.result ?? 'success',
  };
}

export function withAuditFailure(
  identity: AdminAuditIdentity,
  overrides: Partial<AdminAuditIdentity> = {},
): AdminAuditIdentity {
  return {
    ...identity,
    ...overrides,
    result: 'failure',
  };
}
