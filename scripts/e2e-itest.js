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

if (!BASE_URL) {
  console.error("FUNCTION_BASE_URL is required");
  process.exit(2);
}

function withSlash(base, p) {
  return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
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
    const res = await getJson(url);
    const durationMs = Date.now() - t0;
    const pass = res.status === 200 && res.json && (res.json.ok === true || res.json.status === "ok");
    if (!pass) failures++;
    results.push({ name: "health", url, status: res.status, durationMs, pass, body: res.json });
  } catch (err) {
    failures++;
    results.push({ name: "health", error: String(err) });
  }

  // Test 2: /api/feed
  try {
    const url = withSlash(BASE_URL, "/api/feed");
    const t0 = Date.now();
    const res = await getJson(url);
    const durationMs = Date.now() - t0;
    const pass = res.status === 200 && res.json && (res.json.ok === true || res.json.status === "ok");
    if (!pass) failures++;
    results.push({ name: "feed", url, status: res.status, durationMs, pass, body: res.json });
  } catch (err) {
    failures++;
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

