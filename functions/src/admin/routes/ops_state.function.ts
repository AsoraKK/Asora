import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import { createErrorResponse, createSuccessResponse, handleCorsAndMethod } from '@shared/utils/http';
import { requireActiveAdmin, requireActiveModerator } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';

interface OpsStateDocument {
  id: 'ops_state';
  partitionKey: 'ops';
  schemaVersion: 1;
  operatorChecklistMode: boolean;
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_STATE: OpsStateDocument = {
  id: 'ops_state',
  partitionKey: 'ops',
  schemaVersion: 1,
  operatorChecklistMode: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

async function readOpsState(): Promise<OpsStateDocument> {
  const database = getCosmosDatabase();
  const container = database.container('config');
  try {
    const { resource } = await container.item('ops_state', 'ops').read<OpsStateDocument>();
    if (resource) {
      return resource;
    }
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 404) {
      throw error;
    }
  }

  const seeded: OpsStateDocument = {
    ...DEFAULT_STATE,
    updatedAt: new Date().toISOString(),
  };
  const { resource } = await container.items.upsert(seeded);
  return (resource as OpsStateDocument | undefined) ?? seeded;
}

async function writeOpsState(document: OpsStateDocument): Promise<OpsStateDocument> {
  const database = getCosmosDatabase();
  const container = database.container('config');
  const { resource } = await container.items.upsert(document);
  return (resource as OpsStateDocument | undefined) ?? document;
}

async function getOpsState(
  req: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const state = await readOpsState();
    return createSuccessResponse(
      {
        schemaVersion: 1,
        operatorChecklistMode: state.operatorChecklistMode,
        updatedAt: state.updatedAt,
        updatedBy: state.updatedBy,
      },
      {
        'Cache-Control': 'private, no-store',
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'internal_error', 'Failed to read ops state', {
      'Cache-Control': 'private, no-store',
    });
  }
}

interface PutOpsStateBody {
  operatorChecklistMode?: unknown;
}

async function putOpsState(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  let body: PutOpsStateBody;
  try {
    body = (await req.json()) as PutOpsStateBody;
  } catch {
    return createErrorResponse(400, 'invalid_json', 'Request body must be valid JSON', {
      'Cache-Control': 'private, no-store',
    });
  }

  if (typeof body?.operatorChecklistMode !== 'boolean') {
    return createErrorResponse(400, 'invalid_payload', 'operatorChecklistMode must be boolean', {
      'Cache-Control': 'private, no-store',
    });
  }

  const actorId = (req as HttpRequest & { principal: { sub: string } }).principal.sub;

  try {
    const previous = await readOpsState();
    const updated: OpsStateDocument = {
      ...previous,
      schemaVersion: 1,
      operatorChecklistMode: body.operatorChecklistMode,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
    };

    const persisted = await writeOpsState(updated);

    await recordAdminAudit({
      actorId,
      action: 'OPS_CHECKLIST_MODE_UPDATE',
      subjectId: 'ops_state',
      targetType: 'config',
      reasonCode: 'OPS_CHECKLIST_MODE_UPDATE',
      note: `operatorChecklistMode=${persisted.operatorChecklistMode ? 'enabled' : 'disabled'}`,
      before: { operatorChecklistMode: previous.operatorChecklistMode },
      after: { operatorChecklistMode: persisted.operatorChecklistMode },
      correlationId: context.invocationId,
      metadata: { schemaVersion: 1 },
    });

    context.log('admin.ops.state.updated', {
      actorId,
      correlationId: context.invocationId,
      beforeMode: previous.operatorChecklistMode,
      afterMode: persisted.operatorChecklistMode,
    });

    return createSuccessResponse(
      {
        schemaVersion: 1,
        operatorChecklistMode: persisted.operatorChecklistMode,
        updatedAt: persisted.updatedAt,
        updatedBy: persisted.updatedBy,
      },
      {
        'Cache-Control': 'private, no-store',
      }
    );
  } catch (error) {
    context.error('admin.ops.state_update_failed', error);
    return createErrorResponse(500, 'internal_error', 'Failed to update ops state', {
      'Cache-Control': 'private, no-store',
    });
  }
}

const guardedGetOpsState = requireActiveModerator(getOpsState);
const guardedPutOpsState = requireActiveAdmin(putOpsState);

async function opsStateRouteHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET', 'PUT']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  if ((req.method ?? 'GET').toUpperCase() === 'PUT') {
    return guardedPutOpsState(req, context);
  }

  return guardedGetOpsState(req, context);
}

app.http('admin_ops_state', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/ops/state',
  handler: withRateLimit(opsStateRouteHandler, (req) => getPolicyForRoute(req)),
});

export { getOpsState, putOpsState, opsStateRouteHandler, readOpsState };
