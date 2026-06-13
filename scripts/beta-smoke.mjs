#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const DEFAULT_WEB_BASE_URL = 'https://lythaus-web.pages.dev';
const DEFAULT_API_BASE_URL = 'https://asora-function-prod.northeurope-01.azurewebsites.net/api';
const DEFAULT_ADMIN_API_URL = 'https://admin-api.asora.co.za';

function isPrivateOrLocalHost(host) {
  const normalized = host.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized === '::1') return true;
  if (normalized.endsWith('.local')) return true;
  if (normalized === '127.0.0.1' || normalized === '0.0.0.0') return true;

  const match = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(normalized);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function requirePublicHttpsOrigin(name, value) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    throw new Error(`${name} is required`);
  }

  const uri = new URL(trimmed);
  if (uri.protocol !== 'https:' || !uri.hostname) {
    throw new Error(`${name} must be a public HTTPS origin`);
  }

  if (isPrivateOrLocalHost(uri.hostname)) {
    throw new Error(`${name} must not target localhost or a private host`);
  }

  return uri;
}

function normalizeOrigin(url) {
  return url.toString().replace(/\/+$/, '');
}

function buildUrl(baseUrl, path) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\/+/, ''), base).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForAnyText(page, texts, timeout = 20_000) {
  await page.waitForFunction(
    (expectedTexts) => {
      const bodyText = document.body?.innerText ?? '';
      return expectedTexts.some((text) => bodyText.includes(text));
    },
    texts,
    { timeout },
  );
}

async function fetchWithBody(url, init = {}) {
  const response = await fetch(url, init);
  const body = await response.text();
  return { response, body };
}

const webBaseUrl = normalizeOrigin(
  requirePublicHttpsOrigin('WEB_BASE_URL', process.env.WEB_BASE_URL || DEFAULT_WEB_BASE_URL),
);
const apiBaseUrl = normalizeOrigin(
  requirePublicHttpsOrigin('API_BASE_URL', process.env.API_BASE_URL || DEFAULT_API_BASE_URL),
);
const adminApiUrl = normalizeOrigin(
  requirePublicHttpsOrigin('ADMIN_API_URL', process.env.ADMIN_API_URL || DEFAULT_ADMIN_API_URL),
);

const smokeToken = (process.env.BETA_SMOKE_TOKEN || process.env.STAGING_SMOKE_TOKEN || '').trim();
const accessClientId = (process.env.CF_ACCESS_CLIENT_ID || process.env.CF_Access_Client_Id || '').trim();
const accessClientSecret = (process.env.CF_ACCESS_CLIENT_SECRET || process.env.CF_Access_Client_Secret || '').trim();
const reportPath = (process.env.BETA_SMOKE_REPORT_PATH || '').trim();

if (!smokeToken) {
  throw new Error('BETA_SMOKE_TOKEN or STAGING_SMOKE_TOKEN is required for authenticated API smoke checks');
}

if (!accessClientId || !accessClientSecret) {
  throw new Error('CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required for admin API smoke checks');
}

const report = {
  generatedAt: new Date().toISOString(),
  config: {
    webBaseUrl,
    apiBaseUrl,
    adminApiUrl,
  },
  checks: [],
  forbiddenRequests: [],
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  permissionRequests: 0,
  permissionQueries: 0,
};

function recordCheck(name, status, details = {}) {
  report.checks.push({ name, status, ...details });
}

let browser;
let context;
let page;

try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: false,
  });

  await context.addInitScript(() => {
    const bump = (key) => {
      try {
        const current = Number(sessionStorage.getItem(key) || '0');
        sessionStorage.setItem(key, String(current + 1));
      } catch {
        // Ignore storage failures; the smoke checks still run.
      }
    };

    try {
      if (typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function') {
        const original = Notification.requestPermission.bind(Notification);
        Object.defineProperty(Notification, 'requestPermission', {
          configurable: true,
          value: async (...args) => {
            bump('__betaSmokeNotificationRequests');
            return original(...args);
          },
        });
      }
    } catch {
      // Best-effort prompt tracking.
    }

    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        Object.defineProperty(navigator.permissions, 'query', {
          configurable: true,
          value: async (descriptor) => {
            if (descriptor && descriptor.name === 'notifications') {
              bump('__betaSmokeNotificationQueries');
            }
            return originalQuery(descriptor);
          },
        });
      }
    } catch {
      // Best-effort prompt tracking.
    }
  });

  page = await context.newPage();
  page.setDefaultTimeout(20_000);

  page.on('pageerror', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    report.pageErrors.push(message);
    console.error(`[pageerror] ${message}`);
  });

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      report.consoleErrors.push(text);
      console.error(`[console.error] ${text}`);
    }
  });

  page.on('request', (request) => {
    const requestUrl = request.url();
    if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
      return;
    }

    const hostname = new URL(requestUrl).hostname;
    if (isPrivateOrLocalHost(hostname)) {
      report.forbiddenRequests.push(requestUrl);
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'unknown error';
    const url = request.url();
    report.failedRequests.push({ url, failure });
    console.error(`[requestfailed] ${request.method()} ${url} -> ${failure}`);
  });

  console.log(`Web base:   ${webBaseUrl}`);
  console.log(`API base:   ${apiBaseUrl}`);
  console.log(`Admin API:  ${adminApiUrl}`);

  await (async () => {
    const landingUrl = buildUrl(webBaseUrl, '/');
    const response = await page.goto(landingUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `Landing request failed for ${landingUrl}`);
    assert(response.status() === 200, `Landing page returned HTTP ${response.status()}`);
    await waitForAnyText(page, ['Welcome to Lythaus', 'Continue as guest']);
    assert(new URL(page.url()).pathname === '/login', `Landing should redirect to /login, got ${page.url()}`);
    recordCheck('landing redirects to /login', 'passed', { path: page.url() });
  })();

  await (async () => {
    const loginUrl = buildUrl(webBaseUrl, '/login');
    const response = await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `Login request failed for ${loginUrl}`);
    assert(response.status() === 200, `Login page returned HTTP ${response.status()}`);
    await waitForAnyText(page, ['Welcome to Lythaus', 'Continue as guest', 'Sign in']);
    assert(new URL(page.url()).pathname === '/login', `Expected /login, got ${page.url()}`);
    recordCheck('/login loads', 'passed', { path: page.url() });
  })();

  await (async () => {
    const callbackUrl = buildUrl(webBaseUrl, '/auth/callback');
    const response = await page.goto(callbackUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `Auth callback request failed for ${callbackUrl}`);
    assert(response.status() === 200, `Auth callback route returned HTTP ${response.status()}`);
    await waitForAnyText(page, ['Back to sign in', 'Sign-in failed']);
    assert(new URL(page.url()).pathname === '/auth/callback', `Expected /auth/callback, got ${page.url()}`);
    recordCheck('/auth/callback route does not hard-404', 'passed', { path: page.url() });
  })();

  await (async () => {
    const userUrl = buildUrl(webBaseUrl, '/user/test');
    const response = await page.goto(userUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `User deep link request failed for ${userUrl}`);
    assert(response.status() === 200, `User deep link returned HTTP ${response.status()}`);
    await waitForAnyText(page, ['Profile']);
    assert(new URL(page.url()).pathname === '/user/test', `Expected /user/test, got ${page.url()}`);

    const reload = await page.reload({ waitUntil: 'domcontentloaded' });
    assert(reload, 'User deep link reload failed');
    assert(reload.status() === 200, `User deep link reload returned HTTP ${reload.status()}`);
    await waitForAnyText(page, ['Profile']);
    recordCheck('/user/test deep link falls back to app', 'passed', { path: page.url() });
  })();

  await (async () => {
    const postUrl = buildUrl(webBaseUrl, '/post/test');
    const response = await page.goto(postUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `Post deep link request failed for ${postUrl}`);
    assert(response.status() === 200, `Post deep link returned HTTP ${response.status()}`);
    await waitForAnyText(page, ['Post']);
    assert(new URL(page.url()).pathname === '/post/test', `Expected /post/test, got ${page.url()}`);

    const reload = await page.reload({ waitUntil: 'domcontentloaded' });
    assert(reload, 'Post deep link reload failed');
    assert(reload.status() === 200, `Post deep link reload returned HTTP ${reload.status()}`);
    await waitForAnyText(page, ['Post']);
    recordCheck('/post/test deep link falls back to app', 'passed', { path: page.url() });
  })();

  await (async () => {
    const loginUrl = buildUrl(webBaseUrl, '/login');
    const response = await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    assert(response, `Login request failed for guest smoke at ${loginUrl}`);
    await waitForAnyText(page, ['Continue as guest']);
    await page.getByText('Continue as guest', { exact: true }).click();
    await waitForAnyText(page, ['Discover calm, trustworthy updates tailored to you.', 'No posts yet']);
    assert(new URL(page.url()).pathname === '/', `Guest flow should land on /, got ${page.url()}`);
    recordCheck('app shell loads', 'passed', { path: page.url() });
    recordCheck('guest discovery feed loads or empty-states', 'passed', { path: page.url() });
  })();

  await (async () => {
    const counter = await page.evaluate(() => ({
      notificationRequests: Number(sessionStorage.getItem('__betaSmokeNotificationRequests') || '0'),
      notificationQueries: Number(sessionStorage.getItem('__betaSmokeNotificationQueries') || '0'),
    }));

    assert(counter.notificationRequests === 0, `Notification permission was requested ${counter.notificationRequests} time(s)`);
    assert(counter.notificationQueries === 0, `Notification permission was queried ${counter.notificationQueries} time(s)`);
    recordCheck('no browser permission prompt', 'passed');
    report.permissionRequests = counter.notificationRequests;
    report.permissionQueries = counter.notificationQueries;
  })();

  await (async () => {
    const url = buildUrl(apiBaseUrl, 'feed/discover?limit=1');
    const { response } = await fetchWithBody(url, {
      headers: {
        Authorization: `Bearer ${smokeToken}`,
        Accept: 'application/json',
      },
    });

    const cacheControl = response.headers.get('cache-control') || '';
    assert(response.ok, `Authenticated feed returned HTTP ${response.status}`);
    assert(/no-store/i.test(cacheControl), `Authenticated feed must be no-store, got: ${cacheControl || '<missing>'}`);
    recordCheck('authenticated API responses are no-store', 'passed', {
      status: response.status,
      cacheControl,
    });
  })();

  await (async () => {
    const url = buildUrl(adminApiUrl, 'api/admin/config');
    const { response, body } = await fetchWithBody(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'application/json',
      },
    });

    assert(response.status === 401 || response.status === 403 || (response.status >= 300 && response.status < 400),
      `Unauthenticated admin request should be blocked, got HTTP ${response.status}`);
    recordCheck('admin API requires Cloudflare Access/auth', 'passed', {
      status: response.status,
    });
  })();

  await (async () => {
    const url = buildUrl(adminApiUrl, 'api/admin/config');
    const { response, body } = await fetchWithBody(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'application/json',
        'CF-Access-Client-Id': accessClientId,
        'CF-Access-Client-Secret': accessClientSecret,
      },
    });

    assert(
      response.status === 200 || response.status === 404,
      `Service-token admin request should return 200 or 404, got HTTP ${response.status}: ${body.slice(0, 200)}`,
    );

    const cacheControl = response.headers.get('cache-control') || '';
    if (response.status === 200) {
      assert(/no-store/i.test(cacheControl), `Authenticated admin response must be no-store, got: ${cacheControl || '<missing>'}`);
    }

    recordCheck('admin service token reaches protected API', 'passed', {
      status: response.status,
      cacheControl,
    });
  })();

  assert(report.forbiddenRequests.length === 0, `Forbidden local/private requests observed: ${report.forbiddenRequests.join(', ')}`);

  console.log('\nSmoke checks passed.');
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  if (page) {
    try {
      await page.close();
    } catch {
      // Ignore cleanup failures.
    }
  }

  if (context) {
    try {
      await context.close();
    } catch {
      // Ignore cleanup failures.
    }
  }

  if (browser) {
    try {
      await browser.close();
    } catch {
      // Ignore cleanup failures.
    }
  }

  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  console.log(`Report: ${reportPath || '<not written>'}`);
}
