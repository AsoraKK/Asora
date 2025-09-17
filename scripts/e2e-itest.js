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

const BASE_URL = process.env.FUNCTION_BASE_URL;
const FUNCTION_KEY = process.env.FUNCTION_KEY || process.env.AZURE_FUNCTION_KEY;
const VERBOSE = process.argv.includes("--verbose");

const ok = (j) => j?.ok === true || j?.success === true || j?.status === 'ok';

if (!BASE_URL) {
  console.error("FUNCTION_BASE_URL is required");
  process.exit(2);
}

function withSlash(base, p) {
  return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
}

async function getJsonWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await getJson(url, options);
      
      // If we get 503 (Service Unavailable), retry after delay for cold start
      if (result.status === 503 && attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 10000); // Progressive delay, max 10s
        console.log(`Attempt ${attempt}/${maxRetries}: Got 503, retrying in ${delay}ms (cold start?)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 5000);
        console.log(`Attempt ${attempt}/${maxRetries}: Error ${err.message}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
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
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    // ignore JSON parse error; keep json as null
  }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];
  let failures = 0;

  // Test 1: /api/health
  try {
    const url = withSlash(BASE_URL, "/api/health");
    const t0 = Date.now();
    const res = await getJsonWithRetry(url);
    const durationMs = Date.now() - t0;
    const pass = res.status === 200 && res.json && ok(res.json);
    if (!pass) {
      failures++;
      console.error(`health check failed: status=${res.status}, body=${JSON.stringify(res.json)}`);
    } else if (VERBOSE) {
      console.log(`health check ok: status=${res.status}, body=${JSON.stringify(res.json)}`);
    }
    results.push({ name: "health", url, status: res.status, durationMs, pass, body: res.json });
  } catch (err) {
    failures++;
    console.error("health check error:", err);
    results.push({ name: "health", error: String(err) });
  }

  // Test 2: /api/feed
  try {
    const url = withSlash(BASE_URL, "/api/feed");
    const t0 = Date.now();
    const res = await getJsonWithRetry(url);
    const durationMs = Date.now() - t0;
    const pass = res.status === 200 && res.json && ok(res.json);
    if (!pass) {
      failures++;
      console.error(`feed check failed: status=${res.status}, body=${JSON.stringify(res.json)}`);
    } else if (VERBOSE) {
      console.log(`feed check ok: status=${res.status}, body=${JSON.stringify(res.json)}`);
    }
    results.push({ name: "feed", url, status: res.status, durationMs, pass, body: res.json });
  } catch (err) {
    failures++;
    console.error("feed check error:", err);
    results.push({ name: "feed", error: String(err) });
  }

  const finishedAt = new Date().toISOString();
  const summary = {
    startedAt,
    finishedAt,
    baseUrl: BASE_URL,
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

