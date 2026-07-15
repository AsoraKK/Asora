#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const apiBaseUrl = (process.env.DSR_DRILL_API_BASE_URL || 'https://admin-api.lythaus.co/api').replace(/\/+$/, '');
const token = (process.env.DSR_DRILL_BEARER_TOKEN || '').trim();
const reportPath = process.env.DSR_DRILL_REPORT_PATH || 'docs/evidence/alpha-readiness/dsr-live-drill-report.json';
const pollCount = Number(process.env.DSR_DRILL_POLL_COUNT || '18');
const pollIntervalMs = Number(process.env.DSR_DRILL_POLL_INTERVAL_MS || '5000');
const queueAccount = (process.env.DSR_DRILL_QUEUE_ACCOUNT || '').trim();
const queueName = (process.env.DSR_DRILL_QUEUE_NAME || 'dsr-requests').trim();
const successfulTerminalStatuses = {
  export: new Set(['awaiting_review', 'ready_to_release', 'released', 'succeeded']),
  delete: new Set(['succeeded']),
};
const failedTerminalStatuses = new Set(['failed', 'canceled']);

function fail(message) {
  throw new Error(message);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function uuidv7() {
  const now = BigInt(Date.now());
  const bytes = randomBytes(16);
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Keep body out of evidence unless it is parsed JSON.
  }
  return { status: response.status, json };
}

async function peekQueueCount(stage) {
  if (!queueAccount) {
    return { stage, checked: false, reason: 'DSR_DRILL_QUEUE_ACCOUNT not set' };
  }

  try {
    const { stdout } = await execFileAsync('az', [
      'storage',
      'message',
      'peek',
      '--account-name',
      queueAccount,
      '--queue-name',
      queueName,
      '--num-messages',
      '5',
      '--auth-mode',
      'login',
      '-o',
      'json',
    ], { maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout || '[]');
    return {
      stage,
      checked: true,
      visibleCountCappedAtFive: Array.isArray(parsed) ? parsed.length : 0,
    };
  } catch (error) {
    return {
      stage,
      checked: false,
      reason: error instanceof Error ? error.message.split('\n')[0] : String(error),
    };
  }
}

async function enqueue(type, targetUserId, runId) {
  const path = type === 'export' ? '/_admin/dsr/export' : '/_admin/dsr/delete';
  const response = await request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: targetUserId,
      note: `alpha-dsr-${type}-drill-${runId}`,
    }),
  });
  const id = response.json?.data?.id || response.json?.id;
  return {
    type,
    enqueueStatus: response.status,
    requestId: typeof id === 'string' ? id : null,
    initialStatus: response.json?.data?.status || response.json?.status || null,
  };
}

async function poll(type, requestId) {
  const polls = [];
  for (let index = 0; index < pollCount; index += 1) {
    if (index > 0) {
      await sleep(pollIntervalMs);
    }

    const response = await request(`/_admin/dsr/${encodeURIComponent(requestId)}`);
    const data = response.json?.data || response.json || {};
    const state = {
      poll: index + 1,
      at: new Date().toISOString(),
      httpStatus: response.status,
      status: typeof data.status === 'string' ? data.status : null,
      attempt: typeof data.attempt === 'number' ? data.attempt : null,
      completedAt: typeof data.completedAt === 'string' ? data.completedAt : null,
      failureReasonHash: typeof data.failureReason === 'string' ? hash(data.failureReason) : null,
    };
    polls.push(state);

    if (
      successfulTerminalStatuses[type].has(state.status)
      || failedTerminalStatuses.has(state.status)
    ) {
      break;
    }
  }

  const last = polls[polls.length - 1];
  const movedBeyondQueued = Boolean(last?.status && last.status !== 'queued');
  const attemptChanged = polls.some(item => typeof item.attempt === 'number' && item.attempt > 0);
  const passed = successfulTerminalStatuses[type].has(last?.status);
  return {
    type,
    requestId,
    polls,
    movedBeyondQueued,
    attemptChanged,
    passed,
    terminalStatus: successfulTerminalStatuses[type].has(last?.status)
      || failedTerminalStatuses.has(last?.status)
      ? last.status
      : null,
    stuckReason: passed
      ? null
      : failedTerminalStatuses.has(last?.status)
        ? `terminal_status_${last.status}`
        : attemptChanged
          ? 'successful_terminal_status_not_reached'
          : 'status_queued_attempt_zero_after_poll_window',
  };
}

async function main() {
  if (!token) {
    fail('DSR_DRILL_BEARER_TOKEN is required');
  }
  if (!apiBaseUrl.startsWith('https://') || /\.azurewebsites\.net(?:\/|$)/i.test(apiBaseUrl)) {
    fail('DSR_DRILL_API_BASE_URL must be an HTTPS Access-protected admin gateway; direct Azure origins are not permitted');
  }
  if (!Number.isFinite(pollCount) || pollCount < 1) {
    fail('DSR_DRILL_POLL_COUNT must be a positive number');
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
    fail('DSR_DRILL_POLL_INTERVAL_MS must be at least 1000');
  }

  const runId = uuidv7();
  const exportUserId = (process.env.DSR_DRILL_EXPORT_USER_ID || '').trim();
  const deleteUserId = (process.env.DSR_DRILL_DELETE_USER_ID || uuidv7()).trim();
  if (!exportUserId) {
    fail('DSR_DRILL_EXPORT_USER_ID is required and must identify a persistent synthetic test identity');
  }
  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    targetUserHashes: {
      export: hash(exportUserId),
      delete: hash(deleteUserId),
    },
    queue: {
      accountName: queueAccount || null,
      queueName,
    },
    checks: [],
    enqueues: [],
    polls: [],
    result: 'running',
  };

  report.checks.push(await peekQueueCount('before_enqueue'));

  for (const type of ['export', 'delete']) {
    const targetUserId = type === 'export' ? exportUserId : deleteUserId;
    const enqueued = await enqueue(type, targetUserId, runId);
    report.enqueues.push(enqueued);
    report.checks.push(await peekQueueCount(`after_${type}_enqueue`));

    if (enqueued.enqueueStatus < 200 || enqueued.enqueueStatus >= 300 || !enqueued.requestId) {
      report.result = 'failed';
      report.failure = `${type} enqueue failed`;
      break;
    }

    report.polls.push(await poll(type, enqueued.requestId));
  }

  const failedPoll = report.polls.find(item => !item.passed);
  if (report.result !== 'failed') {
    report.result = failedPoll ? 'failed' : 'passed';
    if (failedPoll) {
      report.failure = `${failedPoll.type} ${failedPoll.stuckReason}`;
    }
  }

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`DSR drill report: ${reportPath}`);
  console.log(`DSR drill result: ${report.result}`);
  for (const item of report.polls) {
    const last = item.polls[item.polls.length - 1];
    console.log(`${item.type}: requestId=${item.requestId}; status=${last?.status}; attempt=${last?.attempt}; passed=${item.passed}`);
  }

  if (report.result !== 'passed') {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
