#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument sequence near ${key ?? '<end>'}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function readJson(filePath, label) {
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error.message}`);
  }
}

export function firstApplicationInsightsRow(payload) {
  const table = payload?.tables?.[0];
  const row = table?.rows?.[0];
  if (!table || !row) return null;
  return Object.fromEntries(
    table.columns.map((column, index) => [column.name, row[index] ?? null])
  );
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null;
}

function integerOrNull(value) {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function unwrapOps(payload) {
  return payload?.data ?? payload ?? null;
}

function unwrapAlphaConfig(payload) {
  return payload?.payload?.alpha ?? payload?.data?.payload?.alpha ?? null;
}

function buildAttentionItems(report) {
  const items = [];
  if (!report.telemetry.available) items.push('Application Insights aggregate query unavailable');
  if (!report.cohort.stage) items.push('Alpha stage unavailable');
  if (report.cohort.registeredAccounts === null) items.push('Alpha cohort count unavailable');
  if (report.operations.partial) items.push('Administrative operations snapshot is partial');
  if (report.reliability.apiErrorRatePct !== null && report.reliability.apiErrorRatePct >= 1) {
    items.push('API error rate is at or above 1%');
  }
  if (report.feeds.p95Ms !== null && report.feeds.p95Ms >= 200) {
    items.push('Feed p95 is at or above the 200 ms Alpha target');
  }
  if ([report.dsr.poisonMessages, report.dsr.stuckRequests, report.dsr.failedRequests]
    .some((value) => value !== null && value > 0)) {
    items.push('DSR queue requires operator review');
  }
  if (report.deployment.sha.length !== 40) items.push('Exact deployed SHA unavailable');
  return items;
}

export function buildReport({ telemetryPayload, configPayload, opsPayload, deploymentSha, environment, generatedAt }) {
  const telemetry = firstApplicationInsightsRow(telemetryPayload) ?? {};
  const config = unwrapAlphaConfig(configPayload);
  const ops = unwrapOps(opsPayload);
  const resolvedAt = generatedAt ?? new Date().toISOString();
  const labels = {
    humanAuthored: integerOrNull(telemetry.humanAuthoredPosts),
    aiAssisted: integerOrNull(telemetry.aiAssistedPosts),
    aiGenerated: integerOrNull(telemetry.aiGeneratedPosts),
    underReview: integerOrNull(telemetry.underReviewPosts),
  };
  const totalLabeled = Object.values(labels).reduce((sum, value) => sum + (value ?? 0), 0);
  const cohort = ops?.cohort ?? null;

  const report = {
    schemaVersion: 1,
    generatedAt: resolvedAt,
    window: { hours: 24, from: new Date(Date.parse(resolvedAt) - 86_400_000).toISOString(), to: resolvedAt },
    privacy: { aggregateOnly: true, rawPersonalDataIncluded: false },
    deployment: { sha: deploymentSha ?? '', environment: environment ?? 'unknown' },
    telemetry: { available: Object.keys(telemetry).length > 0 },
    cohort: {
      stage: cohort?.stage ?? config?.stage ?? null,
      registeredAccounts: integerOrNull(cohort?.registeredAccounts),
      capacity: integerOrNull(cohort?.capacity ?? config?.maxRegisteredAccounts),
      remaining: integerOrNull(cohort?.remaining),
      stageReviewDate: config?.stageReviewDate ?? null,
      stageEndDate: config?.stageEndDate ?? null,
    },
    users: {
      activeUsersEstimate: integerOrNull(telemetry.activeUsersEstimate),
      newUsers: integerOrNull(telemetry.newUsers),
      inviteUsage: {
        created: integerOrNull(telemetry.invitesCreated),
        redeemed: integerOrNull(telemetry.invitesRedeemed),
      },
    },
    reliability: {
      totalRequests: integerOrNull(telemetry.totalRequests),
      failedRequests: integerOrNull(telemetry.failedRequests),
      apiErrorRatePct: numberOrNull(telemetry.apiErrorRatePct),
      authFailures: integerOrNull(telemetry.authFailures),
      authenticationSuccessRatePct: numberOrNull(telemetry.authenticationSuccessRatePct),
      infrastructureExceptions: integerOrNull(telemetry.infrastructureExceptions),
    },
    feeds: {
      requests: integerOrNull(telemetry.feedRequests),
      failedRequests: integerOrNull(telemetry.feedFailedRequests),
      errorRatePct: numberOrNull(telemetry.feedErrorRatePct),
      p50Ms: numberOrNull(telemetry.feedP50Ms),
      p95Ms: numberOrNull(telemetry.feedP95Ms),
      p99Ms: numberOrNull(telemetry.feedP99Ms),
    },
    moderation: {
      openFlags: integerOrNull(ops?.queues?.openFlags),
      pendingAppeals: integerOrNull(ops?.queues?.pendingAppeals),
      appealsCreated: integerOrNull(telemetry.appealsCreated),
      appealsResolved: integerOrNull(telemetry.appealsResolved),
      appealOverturnRatePct: numberOrNull(telemetry.appealOverturnRatePct),
      labelDistribution: labels,
      totalLabeledPosts: totalLabeled,
      classificationConflicts: integerOrNull(telemetry.aiClassificationConflicts),
      classificationUnavailable: integerOrNull(telemetry.aiClassificationUnavailable),
    },
    dsr: {
      queueMessages: integerOrNull(telemetry.dsrQueueMessages),
      poisonMessages: integerOrNull(telemetry.dsrPoisonMessages),
      stuckRequests: integerOrNull(telemetry.dsrStuckRequests),
      failedRequests: integerOrNull(telemetry.dsrFailedRequests),
    },
    operations: {
      severity: ops?.incident?.severity ?? 'unknown',
      partial: ops?.partial ?? true,
      supportIncidents: integerOrNull(telemetry.supportIncidents),
      infrastructureAlerts: integerOrNull(telemetry.infrastructureExceptions),
      auditEvents24h: integerOrNull(ops?.queues?.audit24h),
      errors: Array.isArray(ops?.errors) ? ops.errors.map((entry) => entry.code) : ['ops_snapshot_unavailable'],
    },
    openBlockers: [],
  };
  report.openBlockers = buildAttentionItems(report);
  report.status = report.openBlockers.length === 0 ? 'normal' : 'attention_required';
  return report;
}

function renderMarkdown(report) {
  const value = (input, suffix = '') => input === null || input === undefined ? 'Unavailable' : `${input}${suffix}`;
  return `# Lythaus Alpha daily operations report

- Generated: ${report.generatedAt}
- Status: ${report.status}
- Environment: ${report.deployment.environment}
- Deployment SHA: ${report.deployment.sha || 'Unavailable'}
- Alpha stage: ${report.cohort.stage ?? 'Unavailable'}
- Cohort: ${value(report.cohort.registeredAccounts)} / ${value(report.cohort.capacity)}
- API error rate: ${value(report.reliability.apiErrorRatePct, '%')}
- Feed p50 / p95 / p99: ${value(report.feeds.p50Ms, ' ms')} / ${value(report.feeds.p95Ms, ' ms')} / ${value(report.feeds.p99Ms, ' ms')}
- Pending appeals: ${value(report.moderation.pendingAppeals)}
- DSR stuck / failed / poison: ${value(report.dsr.stuckRequests)} / ${value(report.dsr.failedRequests)} / ${value(report.dsr.poisonMessages)}

## Operator attention

${report.openBlockers.length > 0 ? report.openBlockers.map((item) => `- ${item}`).join('\n') : '- None detected by automated checks.'}

This report contains aggregate operational data only. It does not authorize deployment, rollback, cohort expansion, threshold changes, or destructive actions.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.telemetry || !args.config || !args.ops || !args.output) {
    throw new Error('--telemetry, --config, --ops, and --output are required');
  }
  const report = buildReport({
    telemetryPayload: readJson(args.telemetry, 'telemetry input'),
    configPayload: readJson(args.config, 'config input'),
    opsPayload: readJson(args.ops, 'operations input'),
    deploymentSha: args['deployment-sha'],
    environment: args.environment,
  });
  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`);
  if (args['markdown-output']) {
    fs.mkdirSync(path.dirname(args['markdown-output']), { recursive: true });
    fs.writeFileSync(args['markdown-output'], renderMarkdown(report));
  }
  if (report.status !== 'normal') {
    process.stderr.write(`Alpha daily report requires attention: ${report.openBlockers.join('; ')}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
