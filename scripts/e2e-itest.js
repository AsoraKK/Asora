#!/usr/bin/env node
"use strict";

/**
 * Minimal E2E integration script for Azure Functions.
 * - Runs from CI with working-directory set to `functions/`
 * - Invokes health and feed endpoints on the deployed function app
 * - Writes `e2e-report.json` to the current working directory
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_BASE_URL = "https://asora-function-dev.azurewebsites.net";
const BASE_URL = process.env.BASE_URL || process.env.FUNCTION_BASE_URL || DEFAULT_BASE_URL;
const FUNCTION_KEY = process.env.FUNCTION_KEY || process.env.AZURE_FUNCTION_KEY;
const VERBOSE = process.argv.includes("--verbose");
const DEFAULT_THRESHOLD_MS = 8000;
const thresholdMsEnv = process.env.THRESHOLD_MS ?? process.env.LATENCY_THRESHOLD_MS;
const thresholdSecEnv = process.env.LATENCY_THRESHOLD_SEC ?? process.env.THRESHOLD_SEC;
const thresholdCandidate = thresholdMsEnv !== undefined && thresholdMsEnv !== ""
  ? Number(thresholdMsEnv)
  : thresholdSecEnv !== undefined && thresholdSecEnv !== ""
    ? Number(thresholdSecEnv) * 1000
    : DEFAULT_THRESHOLD_MS;

const DEFAULT_RETRIES = 6;
const rawRetries = process.env.RETRIES ?? process.env.E2E_RETRIES;
const retriesCandidate = rawRetries === undefined || rawRetries === ""
  ? DEFAULT_RETRIES
  : Number(rawRetries);

const BACKOFF_SEQUENCE_MS = [1000, 2000, 4000, 8000, 16000, 32000];

const ok = (j) => j?.ok === true || j?.success === true || j?.status === "ok";

if (!BASE_URL) {
  console.error("BASE_URL is required (set BASE_URL or FUNCTION_BASE_URL)");
  process.exit(2);
}

if (!Number.isFinite(thresholdCandidate) || thresholdCandidate <= 0) {
  console.error("Invalid latency threshold; provide THRESHOLD_MS (>0) or THRESHOLD_SEC");
  process.exit(2);
}

if (!Number.isFinite(retriesCandidate) || retriesCandidate < 0 || !Number.isInteger(retriesCandidate)) {
  console.error("Invalid RETRIES; provide a non-negative integer");
  process.exit(2);
}

const THRESHOLD_MS = thresholdCandidate;
const RETRIES = retriesCandidate;
const thresholdSeconds = THRESHOLD_MS / 1000;

console.log(`[e2e] Target base URL: ${BASE_URL} (threshold ${THRESHOLD_MS}ms ≈ ${thresholdSeconds.toFixed(2)}s, retries ${RETRIES})`);

function withSlash(base, p) {
  return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
}

async function getJsonWithRetry(url, options = {}, retries = RETRIES) {
  let lastError;
  const totalAttempts = retries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const result = await getJson(url, options);

      if (result.status === 503 && attempt <= retries) {
        const delayMs = BACKOFF_SEQUENCE_MS[Math.min(attempt - 1, BACKOFF_SEQUENCE_MS.length - 1)];
        console.log(`Attempt ${attempt}/${totalAttempts}: 503 from ${url}, retrying in ${delayMs}ms (host cold start)...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return result;
    } catch (err) {
      lastError = err;
      if (attempt <= retries) {
        const delayMs = BACKOFF_SEQUENCE_MS[Math.min(attempt - 1, BACKOFF_SEQUENCE_MS.length - 1)];
        console.log(`Attempt ${attempt}/${totalAttempts}: Error ${err.message}, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function getJson(url, options = {}) {
  const headers = Object.assign(
    { "Accept": "application/json" },
    options.headers || {}
  );
  if (FUNCTION_KEY && !headers["x-functions-key"]) {
    headers["x-functions-key"] = FUNCTION_KEY;
  }
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    // ignore JSON parse error; keep json as null
  }
  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];
  let failures = 0;

  async function runCheck(name, path) {
    try {
      const url = withSlash(BASE_URL, path);
      const t0 = Date.now();
      const res = await getJsonWithRetry(url);
      const durationMs = Date.now() - t0;
      const snippet = (res.text || "").replace(/\s+/g, " ").slice(0, 200);
      let pass = res.status === 200 && res.json && ok(res.json);
      if (durationMs > THRESHOLD_MS) {
        pass = false;
      }

      const logLine = `[${name}] status=${res.status} latency=${durationMs}ms body=${snippet}`;
      if (pass) {
        if (VERBOSE) {
          console.log(`${logLine} (pass)`);
        } else {
          console.log(`${logLine}`);
        }
      } else {
        console.error(`${logLine} (fail)`);
        failures++;
        if (!res.json || !ok(res.json)) {
          console.error(`${name} response validation failed: ${JSON.stringify(res.json)}`);
        }
        if (durationMs > THRESHOLD_MS) {
          console.error(`${name} latency ${durationMs}ms exceeded threshold ${THRESHOLD_MS}ms`);
        }
      }

      results.push({
        name,
        url,
        status: res.status,
        durationMs,
        pass,
        body: res.json,
        snippet,
      });
    } catch (err) {
      failures++;
      console.error(`${name} check error:`, err);
      results.push({ name, error: String(err) });
    }
  }

  await runCheck("health", "/api/health");
  await runCheck("feed", "/api/feed");

  const finishedAt = new Date().toISOString();
  const summary = {
    startedAt,
    finishedAt,
    baseUrl: BASE_URL,
    thresholdMs: THRESHOLD_MS,
    retries: RETRIES,
    total: results.length,
    failures,
    success: failures === 0,
    results,
  };

  const outPath = path.resolve(process.cwd(), "e2e-report.json");
  try {
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log(`Wrote E2E report: ${outPath}`);
  } catch (e) {
    console.error("Failed to write E2E report:", e);
  }

  if (failures > 0) {
    console.error(`${failures} E2E checks failed.`);
    process.exit(1);
  } else {
    console.log("All E2E checks passed.");
  }
}

// Node 20+ provides global fetch
if (typeof fetch !== "function") {
  console.error("Global fetch not available in this Node runtime.");
  process.exit(3);
}

main().catch((e) => {
  console.error("E2E script error:", e);
  process.exit(1);
});
