import { query, type HyperdriveBinding } from '@lythaus/db';
import type { EnvBindings } from '@lythaus/cloudflare-env';
import { correlationId, json, logEvent } from '@lythaus/observability';
import { hmacLookup } from '@lythaus/security';
import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env extends EnvBindings {
  DB_ADMIN_FRESH: HyperdriveBinding;
  DB_PRIVACY_FRESH: HyperdriveBinding;
}

async function accessSubject(request: Request, env: Env): Promise<string> {
  const assertion = request.headers.get('cf-access-jwt-assertion');
  if (!assertion) throw new Error('access_required');
  if (!env.ACCESS_JWKS_URL || !env.ACCESS_AUDIENCE) throw new Error('access_verification_not_configured');
  const jwks = createRemoteJWKSet(new URL(env.ACCESS_JWKS_URL));
  const verified = await jwtVerify(assertion, jwks, {
    audience: env.ACCESS_AUDIENCE,
    issuer: env.ACCESS_TEAM_DOMAIN ? `https://${env.ACCESS_TEAM_DOMAIN}` : undefined,
  });
  const payload = verified.payload as { sub?: string; email?: string };
  const subject = payload.sub ?? payload.email;
  if (!subject) throw new Error('access_subject_missing');
  return subject;
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  if (!env.ACCESS_SUBJECT_HMAC_KEY) throw new Error('admin_subject_key_not_configured');
  const subjectHmac = hmacLookup(await accessSubject(request, env), env.ACCESS_SUBJECT_HMAC_KEY);
  const result = await query<{ role: string }>(env.DB_ADMIN_FRESH,
    `SELECT role FROM identity.admin_memberships WHERE access_subject_hmac = decode($1, 'base64') AND active = true`,
    [subjectHmac]
  );
  if (result.rowCount !== 1) throw new Error('admin_role_required');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = correlationId(request);
    try {
      const url = new URL(request.url);
      if (request.method === 'OPTIONS') return json(null, { status: 204 });
      if (request.method === 'GET' && url.pathname === '/health') return json({ status: 'ok', service: 'lythaus-admin-api' });
      await requireAdmin(request, env);
      if (request.method === 'GET' && url.pathname === '/api/admin/health') {
        const result = await query(env.DB_ADMIN_FRESH, `SELECT current_timestamp AS database_time`);
        return json({ status: 'ok', database: result.rows[0] }, { headers: { 'x-correlation-id': id, 'cache-control': 'private, no-store' } });
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/privacy/requests') {
        const result = await query(env.DB_PRIVACY_FRESH, `SELECT id, subject_id, request_type, state, created_at FROM privacy.requests ORDER BY created_at DESC LIMIT 100`);
        return json({ items: result.rows }, { headers: { 'x-correlation-id': id, 'cache-control': 'private, no-store' } });
      }
      return json({ error: 'not_found', correlationId: id }, { status: 404 });
    } catch (error) {
      const code = error instanceof Error ? error.message : 'admin_request_failed';
      logEvent({ service: 'lythaus-admin-api', correlationId: id, errorCode: code, route: new URL(request.url).pathname });
      const unauthorized = ['access_required', 'access_assertion_invalid', 'access_subject_missing', 'access_verification_not_configured', 'admin_role_required', 'admin_subject_key_not_configured'].includes(code);
      return json({ error: code, correlationId: id }, { status: unauthorized ? 401 : 400 });
    }
  },
};
