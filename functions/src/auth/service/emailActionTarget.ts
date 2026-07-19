export type EmailActionTarget = 'production' | 'preview';

const previewHostname = /^[a-f0-9]{8}\.lythaus-web\.pages\.dev$/;

function parseExactHttpsOrigin(value: string, name: string, previewOnly = false): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    (previewOnly && !previewHostname.test(parsed.hostname))
  ) {
    throw new Error(`${name} is not an approved HTTPS origin`);
  }
  return parsed.origin;
}

export function parseEmailActionTarget(value: unknown): EmailActionTarget {
  if (value === 'production' || value === 'preview') return value;
  throw new Error('action_target must be production or preview');
}

export function resolveEmailActionOrigin(target: EmailActionTarget): string {
  if (target === 'production') {
    const configured = process.env.APP_ORIGIN?.trim();
    if (!configured) throw new Error('Missing APP_ORIGIN');
    const origin = parseExactHttpsOrigin(configured, 'APP_ORIGIN');
    if (origin !== 'https://app.lythaus.co') {
      throw new Error('APP_ORIGIN must be the canonical Lythaus application origin');
    }
    return origin;
  }

  const configured = process.env.AUTH_EMAIL_PREVIEW_ORIGIN?.trim();
  if (!configured) throw new Error('Preview email links are not enabled');
  return parseExactHttpsOrigin(configured, 'AUTH_EMAIL_PREVIEW_ORIGIN', true);
}
