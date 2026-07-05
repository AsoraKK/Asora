import type { InvocationContext } from '@azure/functions';

type CliOptions = {
  requestId: string;
  dryRun: boolean;
  force: boolean;
};

const ALLOWED_STATUSES = new Set(['queued', 'failed', 'canceled']);
const REDACTED_KEYS = /^(userId|requestedBy|email|token|secret|authorization|subject)$/i;

function printHelp(): void {
  console.log(`Usage: npm run dsr:manual -- --request-id <dsr-request-id> [--dry-run] [--force]

Manually processes one DSR request by invoking the existing export/delete job code
outside the Azure Queue trigger. This is for internal operational fallback only.

Options:
  --request-id, -r   Required DSR request id from privacy_requests
  --dry-run          Validate lookup and status without executing the job
  --force            Bypass the status gate (default allowed: queued, failed, canceled)
  --help, -h         Show this message
`);
}

function parseArgs(argv: string[]): CliOptions {
  let requestId = '';
  let dryRun = false;
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--request-id' || arg === '-r') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      requestId = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!requestId) {
    throw new Error('--request-id is required');
  }

  return { requestId, dryRun, force };
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sanitize(item));
  }

  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, innerValue] of Object.entries(value)) {
      next[key] = REDACTED_KEYS.test(key) ? '[redacted]' : sanitize(innerValue);
    }
    return next;
  }

  return value;
}

function createContext(): InvocationContext {
  const invocationId = `manual-dsr-${Date.now()}`;

  const log = (...args: unknown[]) => {
    const rendered = args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      return JSON.stringify(sanitize(arg));
    });

    console.log('[manual-dsr]', ...rendered);
  };

  return {
    invocationId,
    functionName: 'manual-dsr-process',
    extraInputs: new Map(),
    extraOutputs: new Map(),
    retryContext: undefined,
    traceContext: {
      attributes: {},
      traceParent: '',
      traceState: '',
    },
    options: {},
    log,
  } as InvocationContext;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const [{ getDsrRequest }, { runExportJob }, { runDeleteJob }, { getErrorMessage }] = await Promise.all([
    import('../src/privacy/service/dsrStore'),
    import('../src/privacy/worker/exportJob'),
    import('../src/privacy/worker/deleteJob'),
    import('../src/shared/errorUtils'),
  ]);

  const request = await getDsrRequest(options.requestId);
  if (!request) {
    throw new Error(`DSR request ${options.requestId} was not found`);
  }

  console.log(
    '[manual-dsr] request',
    JSON.stringify(
      sanitize({
        id: request.id,
        type: request.type,
        status: request.status,
        attempt: request.attempt,
        requestedAt: request.requestedAt,
      }),
    ),
  );

  if (!options.force && !ALLOWED_STATUSES.has(request.status)) {
    throw new Error(
      `Refusing to process request ${request.id} in status "${request.status}". ` +
        'Use --force only when you have reviewed the request state.',
    );
  }

  if (options.dryRun) {
    console.log('[manual-dsr] dry-run complete');
    return;
  }

  const context = createContext();

  try {
    if (request.type === 'export') {
      await runExportJob(request, context);
    } else {
      await runDeleteJob(request, context);
    }
  } catch (error: unknown) {
    console.error('[manual-dsr] job threw', getErrorMessage(error));
  }

  const updated = await getDsrRequest(options.requestId);
  console.log(
    '[manual-dsr] final',
    JSON.stringify(
      sanitize({
        id: updated?.id ?? request.id,
        type: updated?.type ?? request.type,
        status: updated?.status ?? 'unknown',
        attempt: updated?.attempt ?? request.attempt,
        completedAt: updated?.completedAt ?? null,
        failureReason: updated?.failureReason ?? null,
        exportBlobPath: updated?.exportBlobPath ?? null,
      }),
    ),
  );

  if (!updated) {
    process.exitCode = 1;
    return;
  }

  if (updated.type === 'export' && updated.status === 'awaiting_review') {
    return;
  }

  if (updated.type === 'delete' && updated.status === 'succeeded') {
    return;
  }

  process.exitCode = 1;
}

void main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[manual-dsr] failed', message);
  process.exit(1);
});
