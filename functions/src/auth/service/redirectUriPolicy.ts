const BUILT_IN_REDIRECT_URIS = [
  'com.asora.app://oauth/callback',
  'asora://oauth/callback',
  'http://localhost:8080/oauth/callback',
  'https://lythaus-web.pages.dev/auth/callback',
  'https://app.lythaus.asora.co.za/auth/callback',
  'https://app.lythaus.co/auth/callback',
];

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

export function isRegisteredRedirectUri(value: string): boolean {
  const normalized = normalizeRedirectUri(value);
  if (!normalized) return false;

  const allowed = new Set(
    [...BUILT_IN_REDIRECT_URIS, ...configuredRedirectUris()]
      .map(normalizeRedirectUri)
      .filter((uri): uri is string => Boolean(uri))
  );
  return allowed.has(normalized);
}
