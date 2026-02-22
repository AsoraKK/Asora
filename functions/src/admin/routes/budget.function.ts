/**
 * Admin Budget Endpoints
 *
 * GET  /api/_admin/budget - Returns current Azure budget configuration
 * PUT  /api/_admin/budget - Updates budget amount (adjusts live Azure budget via REST)
 * OPTIONS /api/_admin/budget - CORS preflight
 *
 * Protected by Cloudflare Access JWT validation (owner-only).
 *
 * The budget is stored both as a Cosmos config document (for fast reads)
 * and pushed to the Azure Consumption Budget API on write.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { requireCloudflareAccess } from '../accessAuth';
import { createCorsPreflightResponse, withCorsHeaders } from '../cors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import { getCosmos } from '../../shared/clients/cosmos';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BudgetConfig {
  id: string;
  partitionKey: string;
  /** Monthly budget amount in USD */
  amount: number;
  /** Azure budget resource name */
  azureBudgetName: string;
  /** Resource group scoped to */
  resourceGroup: string;
  /** Alert notification email */
  notificationEmail: string;
  /** Alert thresholds (percentage values) */
  thresholds: {
    actual: number[];
    forecasted: number[];
  };
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Who last updated */
  updatedBy: string;
}

const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  id: 'budget_config',
  partitionKey: 'budget',
  amount: 200,
  azureBudgetName: 'lythaus-dev-monthly',
  resourceGroup: 'asora-psql-flex',
  notificationEmail: 'kyle@asora.co.za',
  thresholds: {
    actual: [50, 80, 100],
    forecasted: [120],
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

// ─────────────────────────────────────────────────────────────────────────────
// Cosmos helpers
// ─────────────────────────────────────────────────────────────────────────────

function getConfigContainer() {
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  const database = getCosmos().database(databaseName);
  return database.container('config');
}

async function readBudgetConfig(): Promise<BudgetConfig> {
  const container = getConfigContainer();
  try {
    const { resource } = await container.item('budget_config', 'budget').read<BudgetConfig>();
    if (resource) return resource;
  } catch (err: unknown) {
    const cosmosErr = err as { code?: number };
    if (cosmosErr.code === 404) {
      // First time — seed default
      const { resource } = await container.items.create(DEFAULT_BUDGET_CONFIG);
      return resource as unknown as BudgetConfig;
    }
    throw err;
  }
  // Fallback: seed default
  const { resource } = await container.items.create(DEFAULT_BUDGET_CONFIG);
  return resource as unknown as BudgetConfig;
}

async function writeBudgetConfig(config: BudgetConfig): Promise<BudgetConfig> {
  const container = getConfigContainer();
  const { resource } = await container.items.upsert(config);
  return resource as unknown as BudgetConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Azure Budget API helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the Azure Consumption Budget via ARM REST API.
 *
 * Requires the Function App's managed identity to have
 * "Cost Management Contributor" on the target resource group.
 *
 * NOTE: In serverless/local dev where managed identity isn't available,
 * the Azure update is skipped and only the Cosmos config is updated.
 */
async function updateAzureBudget(config: BudgetConfig, context: InvocationContext): Promise<boolean> {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    context.warn('[admin/budget] AZURE_SUBSCRIPTION_ID not set — skipping Azure budget update');
    return false;
  }

  // Use @azure/identity DefaultAzureCredential for managed identity token
  try {
    const { DefaultAzureCredential } = await import('@azure/identity');
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://management.azure.com/.default');

    const url =
      `https://management.azure.com/subscriptions/${subscriptionId}` +
      `/resourceGroups/${config.resourceGroup}` +
      `/providers/Microsoft.Consumption/budgets/${config.azureBudgetName}` +
      `?api-version=2023-11-01`;

    // Build notifications object from thresholds
    const notifications: Record<string, unknown> = {};
    for (const threshold of config.thresholds.actual) {
      notifications[`actual_${threshold}_percent`] = {
        enabled: true,
        operator: 'GreaterThan',
        threshold,
        contactEmails: [config.notificationEmail],
        thresholdType: 'Actual',
      };
    }
    for (const threshold of config.thresholds.forecasted) {
      notifications[`forecast_${threshold}_percent`] = {
        enabled: true,
        operator: 'GreaterThan',
        threshold,
        contactEmails: [config.notificationEmail],
        thresholdType: 'Forecasted',
      };
    }

    // Get current budget to preserve timePeriod
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
      },
    });

    let timePeriod = {
      startDate: new Date().toISOString().slice(0, 7) + '-01T00:00:00Z',
      endDate: '2026-12-31T00:00:00Z',
    };

    if (getResponse.ok) {
      const existing = await getResponse.json() as { properties?: { timePeriod?: typeof timePeriod } };
      if (existing.properties?.timePeriod) {
        timePeriod = existing.properties.timePeriod;
      }
    }

    const body = {
      properties: {
        category: 'Cost',
        amount: config.amount,
        timeGrain: 'Monthly',
        timePeriod,
        notifications,
      },
    };

    const putResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      context.error(`[admin/budget] Azure budget update failed (${putResponse.status}): ${errorText}`);
      return false;
    }

    context.log(`[admin/budget] Azure budget updated successfully: $${config.amount}/mo`);
    return true;
  } catch (err) {
    context.error(`[admin/budget] Azure budget update error: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleGet(
  context: InvocationContext,
  correlationId: string,
  origin: string | null,
): Promise<HttpResponseInit> {
  try {
    const config = await readBudgetConfig();
    return withCorsHeaders(
      {
        status: 200,
        jsonBody: {
          ok: true,
          budget: {
            amount: config.amount,
            azureBudgetName: config.azureBudgetName,
            resourceGroup: config.resourceGroup,
            notificationEmail: config.notificationEmail,
            thresholds: config.thresholds,
            updatedAt: config.updatedAt,
            updatedBy: config.updatedBy,
          },
        },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Correlation-ID': correlationId,
        },
      },
      origin,
    );
  } catch (err) {
    context.error(`[admin/budget GET] Error: ${err instanceof Error ? err.message : err} [${correlationId}]`);
    return withCorsHeaders(
      {
        status: 500,
        jsonBody: {
          error: { code: 'INTERNAL_ERROR', message: 'Failed to read budget config', correlationId },
        },
        headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
      },
      origin,
    );
  }
}

async function handlePut(
  request: HttpRequest,
  context: InvocationContext,
  correlationId: string,
  origin: string | null,
  actor: string,
): Promise<HttpResponseInit> {
  try {
    const body = (await request.json()) as { amount?: number };

    if (typeof body.amount !== 'number' || body.amount < 10 || body.amount > 10000) {
      return withCorsHeaders(
        {
          status: 400,
          jsonBody: {
            error: {
              code: 'INVALID_AMOUNT',
              message: 'Budget amount must be between $10 and $10,000',
              correlationId,
            },
          },
          headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
        },
        origin,
      );
    }

    // Read current config and update
    const current = await readBudgetConfig();
    const updated: BudgetConfig = {
      ...current,
      amount: body.amount,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };

    // Persist to Cosmos
    await writeBudgetConfig(updated);

    // Push to Azure (non-blocking — we still return success even if Azure update fails)
    const azureUpdated = await updateAzureBudget(updated, context);

    return withCorsHeaders(
      {
        status: 200,
        jsonBody: {
          ok: true,
          budget: {
            amount: updated.amount,
            azureBudgetName: updated.azureBudgetName,
            resourceGroup: updated.resourceGroup,
            notificationEmail: updated.notificationEmail,
            thresholds: updated.thresholds,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
          },
          azureSynced: azureUpdated,
        },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Correlation-ID': correlationId,
        },
      },
      origin,
    );
  } catch (err) {
    context.error(`[admin/budget PUT] Error: ${err instanceof Error ? err.message : err} [${correlationId}]`);
    return withCorsHeaders(
      {
        status: 500,
        jsonBody: {
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update budget', correlationId },
        },
        headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
      },
      origin,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

async function adminBudgetHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const origin = request.headers.get('Origin');
  const method = request.method.toUpperCase();

  context.log(`[admin/budget ${method}] Request received [${correlationId}]`);

  if (method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Owner-only endpoint
  const authResult = await requireCloudflareAccess(request.headers, { requireOwner: true });
  if ('error' in authResult) {
    context.warn(`[admin/budget ${method}] Auth failed: ${authResult.error} [${correlationId}]`);
    return withCorsHeaders(
      {
        status: authResult.status,
        jsonBody: {
          error: { code: authResult.code || 'UNAUTHORIZED', message: authResult.error, correlationId },
        },
        headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
      },
      origin,
    );
  }

  if (method === 'GET') {
    return handleGet(context, correlationId, origin);
  } else if (method === 'PUT') {
    return handlePut(request, context, correlationId, origin, authResult.actor);
  }

  return withCorsHeaders(
    {
      status: 405,
      jsonBody: {
        error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${method} not allowed`, correlationId },
      },
      headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId },
    },
    origin,
  );
}

// Register HTTP trigger
app.http('admin_budget', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/budget',
  handler: withRateLimit(adminBudgetHandler, (req) => getPolicyForRoute(req)),
});

export { adminBudgetHandler };
