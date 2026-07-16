export type MvpAuthProvider = 'google' | 'email' | 'apple' | 'world' | 'unknown';

const ENABLED_MVP_PROVIDERS = new Set<MvpAuthProvider>(['google', 'email']);

/**
 * Converts the optional upstream IdP hint into the small MVP provider set.
 * Apple and World ID remain reserved for a later implementation but are never
 * accepted by an MVP authorisation request.
 */
export function classifyMvpAuthProvider(idpHint: string | undefined): MvpAuthProvider {
  const normalized = idpHint?.trim().toLowerCase();
  if (!normalized || normalized === 'email') return 'email';
  if (normalized === 'google') return 'google';
  if (normalized === 'apple') return 'apple';
  if (normalized === 'world' || normalized === 'worldid' || normalized === 'world id') return 'world';
  return 'unknown';
}

export function isMvpAuthProviderEnabled(idpHint: string | undefined): boolean {
  return ENABLED_MVP_PROVIDERS.has(classifyMvpAuthProvider(idpHint));
}
