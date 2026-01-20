const DEFAULT_ADMIN_API_URL =
  import.meta.env.VITE_ADMIN_API_URL || 'https://admin-api.asora.co.za';

const STORAGE_KEYS = {
  apiUrl: 'controlPanelAdminApiUrl',
  token: 'controlPanelAdminToken'
};

export function getAdminApiUrl() {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEYS.apiUrl);
    if (stored) {
      return stored;
    }
  }
  return DEFAULT_ADMIN_API_URL;
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

function buildUrl(path, query) {
  const url = new URL(path, getAdminApiUrl());
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
