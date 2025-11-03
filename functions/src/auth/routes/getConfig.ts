import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import { ok, serverError } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export type AuthConfig = {
  tenant: string;
  clientId: string;
  policy: string;
  authorityHost: string;
  scopes: string[];
  redirectUris: {
    android: string;
    ios: string;
  };
  knownAuthorities: string[];
  googleIdpHint?: string;
};

export async function getAuthConfig(
  _req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const kvUrl = process.env.KV_URL;
    if (!kvUrl) {
      context.error('KV_URL environment variable not configured');
      return serverError('Configuration service unavailable');
    }

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(kvUrl, credential);

    // Fetch all B2C config secrets in parallel
    const [tenant, clientId, policy, authorityHost, scopes, androidRedirect, iosRedirect, googleIdp] =
      await Promise.all([
        client.getSecret('b2c-tenant').then((s) => s.value!),
        client.getSecret('b2c-mobile-client-id').then((s) => s.value!),
        client.getSecret('b2c-signin-policy').then((s) => s.value!),
        client.getSecret('b2c-authority-host').then((s) => s.value!),
        client.getSecret('b2c-scopes').then((s) => s.value!),
        client.getSecret('b2c-redirect-uri-android').then((s) => s.value!),
        client.getSecret('b2c-redirect-uri-ios').then((s) => s.value!),
        client
          .getSecret('b2c-google-idp-hint')
          .then((s) => s.value)
          .catch(() => undefined),
      ]);

    const config: AuthConfig = {
      tenant,
      clientId,
      policy,
      authorityHost,
      scopes: scopes.split(' ').filter(Boolean),
      redirectUris: {
        android: androidRedirect,
        ios: iosRedirect,
      },
      knownAuthorities: [authorityHost],
      googleIdpHint: googleIdp,
    };

    context.log('auth.config.fetched', { tenant, policy, clientId: clientId.substring(0, 8) + '...' });

    return ok(config);
  } catch (error: unknown) {
    context.error('auth.config.error', error);
    return serverError('Failed to load auth configuration');
  }
}

/* istanbul ignore next */
const rateLimitedAuthConfig = withRateLimit(
  getAuthConfig,
  (req, context) => getPolicyForFunction('auth-config')
);

app.http('auth-config', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/b2c-config',
  handler: rateLimitedAuthConfig,
});
