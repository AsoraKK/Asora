// Use same-origin proxy by default (/api/* routes to Functions App)
// Falls back to direct API URL if explicitly configured
const DEFAULT_ADMIN_API_URL =
  import.meta.env.VITE_ADMIN_API_URL || '/api/admin';

const STORAGE_KEYS = {
  apiUrl: 'controlPanelAdminApiUrl',
  token: 'controlPanelAdminToken'
};

/**
 * Resolve a potentially relative URL to an absolute URL.
 * Handles both relative paths like "/api/admin" and absolute URLs like "https://...".
 * @param {string} urlOrPath - The URL or path to resolve
 * @returns {string} - An absolute URL suitable for use with new URL()
 */
function resolveToAbsoluteUrl(urlOrPath) {
  // If it's already absolute, return as-is
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  // In browser context, resolve against current origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Ensure we have a trailing slash for proper path joining
    const origin = window.location.origin;
    // Use URL constructor to properly join origin and path
    return new URL(urlOrPath, origin).toString();
  }
  // SSR fallback - return as-is (will fail on server, which is expected)
  return urlOrPath;
}

/**
 * Get the raw (potentially relative) admin API URL from config/storage.
 * Use getAbsoluteAdminApiUrl() for URL construction.
 */
export function getAdminApiUrl() {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEYS.apiUrl);
    if (stored) {
      return stored;
    }
  }
  return DEFAULT_ADMIN_API_URL;
}

/**
 * Get the absolute admin API URL, resolving relative paths against window.location.origin.
 * This is the correct base URL for new URL() construction.
 */
export function getAbsoluteAdminApiUrl() {
  return resolveToAbsoluteUrl(getAdminApiUrl());
}

export function setAdminApiUrl(value) {
  if (typeof window === 'undefined') {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEYS.apiUrl);
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.apiUrl, trimmed);
}

export function getAdminToken() {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(STORAGE_KEYS.token) || '';
}

export function setAdminToken(value) {
  if (typeof window === 'undefined') {
    return;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    window.localStorage.removeItem(STORAGE_KEYS.token);
    return;
  }
  window.localStorage.setItem(STORAGE_KEYS.token, trimmed);
}

/**
 * Build a full URL from a path and optional query parameters.
 * Properly handles both relative and absolute base URLs.
 * @param {string} path - The API endpoint path (e.g., "/moderation/test/upload")
 * @param {Object} query - Optional query parameters
 * @returns {string} - The full absolute URL
 */
function buildUrl(path, query) {
  // Get the absolute base URL (resolves relative paths against origin)
  const baseUrl = getAbsoluteAdminApiUrl();
  
  // Ensure proper path joining:
  // - baseUrl: "https://control.asora.co.za/api/admin" 
  // - path: "/moderation/test/upload"
  // - result: "https://control.asora.co.za/api/admin/moderation/test/upload"
  
  // Normalize: remove trailing slash from base, ensure path starts with /
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  const url = new URL(`${normalizedBase}${normalizedPath}`);
  
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

export async function adminRequest(path, { method = 'GET', body, query, headers: extraHeaders } = {}) {
  const url = buildUrl(path, query);
  const headers = {
    Accept: 'application/json',
    ...(extraHeaders || {})
  };
  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const options = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      response.statusText ||
      'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
