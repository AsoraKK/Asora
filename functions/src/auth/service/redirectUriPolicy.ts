const BUILT_IN_REDIRECT_URIS = [
  'com.asora.app://oauth/callback',
  'asora://oauth/callback',
  'https://app.lythaus.co/auth/callback',
];

const CANONICAL_WEB_CALLBACK = 'https://app.lythaus.co/auth/callback';

function isProductionEnvironment(): boolean {
  const environment = (process.env.NODE_ENV ?? 'production').toLowerCase();
  return environment === 'production' || environment === 'staging';
}

function normalizeRedirectUri(value: string): string | undefined {
  try {
    const uri = new URL(value);
    if (uri.username || uri.password || uri.hash) return undefined;
    return uri.toString();
  } catch {
    return undefined;
  }
}

function configuredRedirectUris(): string[] {
  const raw = process.env.OAUTH_REDIRECT_URIS?.trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  }

  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

function isApprovedConfiguredCallback(value: string): boolean {
  const uri = new URL(value);
  if (
    uri.protocol !== 'https:' ||
    uri.username ||
    uri.password ||
    uri.hash ||
    uri.pathname !== '/auth/callback'
  ) {
    return false;
  }

  if (uri.hostname === 'app.lythaus.co') {
    return uri.toString() === CANONICAL_WEB_CALLBACK;
  }

  // The MVP uses one shared backend for production and immutable Cloudflare
  // previews. Preview callbacks remain temporary, exact-set entries and are
  // restricted to the Flutter Pages project; wildcards never reach this set.
  return uri.hostname.endsWith('.lythaus-web.pages.dev');
}

export function isRegisteredRedirectUri(value: string): boolean {
  const normalized = normalizeRedirectUri(value);
  if (!normalized) return false;

  if (normalized === CANONICAL_WEB_CALLBACK || BUILT_IN_REDIRECT_URIS.includes(normalized)) {
    return true;
  }

  if (!isProductionEnvironment()) {
    const uri = new URL(normalized);
    if (uri.protocol === 'http:' && uri.hostname === 'localhost' && uri.pathname === '/oauth/callback') {
      return true;
    }
  }

  const allowed = new Set(
    configuredRedirectUris()
      .map(normalizeRedirectUri)
      .filter(
        (uri): uri is string =>
          typeof uri === 'string' && isApprovedConfiguredCallback(uri)
      )
  );
  return allowed.has(normalized);
}
