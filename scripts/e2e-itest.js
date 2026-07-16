#!/usr/bin/env node
"use strict";
/* eslint-env node, es2021 */
/* jshint esversion: 6 */

/**
 * Minimal E2E integration script for the public API gateway.
 * - Runs from CI with working-directory set to `functions/`
 * - Invokes public health and discovery endpoints through the deployed gateway
 * - Writes `e2e-report.json` to the current working directory
 */

var fs = require("fs");
var path = require("path");

const DEFAULT_API_BASE_URL = "https://api.lythaus.co/api";
const BASE_URL = (process.env.API_BASE_URL || process.env.BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
const VERBOSE = process.argv.includes("--verbose");
const LATENCY_THRESHOLD_SEC = Number(process.env.LATENCY_THRESHOLD_SEC || process.env.THRESHOLD_SEC || 2.0);

const ok = (j) => j?.ok === true || j?.success === true || j?.status === "ok";

if (!BASE_URL) {
  console.error("API_BASE_URL is required (set API_BASE_URL or BASE_URL)");
  process.exit(2);
}
if (!BASE_URL.startsWith("https://") || /\.azurewebsites\.net(?:\/|$)/i.test(BASE_URL)) {
  console.error("API_BASE_URL must be an HTTPS API gateway URL; direct Azure origins are not permitted");
  process.exit(2);
}

if (Number.isNaN(LATENCY_THRESHOLD_SEC) || LATENCY_THRESHOLD_SEC <= 0) {
  console.error("Invalid latency threshold; provide a positive number in LATENCY_THRESHOLD_SEC");
  process.exit(2);
}

console.log(`[e2e] Target base URL: ${BASE_URL} (threshold ${LATENCY_THRESHOLD_SEC}s)`);

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

  async function runCheck(name, path, required = true) {
    try {
      const url = withSlash(BASE_URL, path);
      const t0 = Date.now();
      const res = await getJsonWithRetry(url);
      const durationMs = Date.now() - t0;
      let pass = res.status === 200 && res.json && ok(res.json);
      if (durationMs > LATENCY_THRESHOLD_SEC * 1000) {
        pass = false;
      }

      const logLine = `[${name}] status=${res.status} latency=${durationMs}ms`;
      if (pass) {
        if (VERBOSE) {
          console.log(`${logLine} (pass)`);
        } else {
          console.log(`${logLine}`);
        }
      } else {
        const level = required ? console.error : console.warn;
        level.call(console, `${logLine} (fail)`);
        if (required) failures++;
        if (!res.json || !ok(res.json)) {
          level.call(console, `${name} response validation failed: ${JSON.stringify(res.json)}`);
        }
        if (durationMs > LATENCY_THRESHOLD_SEC * 1000) {
          level.call(console, `${name} latency ${durationMs}ms exceeded threshold ${LATENCY_THRESHOLD_SEC}s`);
        }
      }

      results.push({
        name,
        url,
        status: res.status,
        durationMs,
        pass,
      });
    } catch (err) {
      failures++;
      console.error(`${name} check error:`, err);
      results.push({ name, error: String(err) });
    }
  }

  const endpointsToCheck = [
    { name: 'health', path: '/health', required: false },
    { name: 'discovery', path: '/feed/discover', required: true },
  ];

  for (const ep of endpointsToCheck) {
    await runCheck(ep.name, ep.path, ep.required);
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
