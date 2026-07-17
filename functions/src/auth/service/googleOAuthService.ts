import { OAuth2Client, type TokenPayload as GoogleTokenPayload } from 'google-auth-library';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_SCOPES = 'openid email profile';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export interface GoogleAuthorizationRequest {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
}

interface GoogleOAuthClientLike {
  getToken(options: {
    code: string;
    codeVerifier: string;
    client_id: string;
    redirect_uri: string;
  }): Promise<{ tokens: { id_token?: string | null } }>;
  verifyIdToken(options: {
    idToken: string;
    audience: string;
  }): Promise<{ getPayload(): GoogleTokenPayload | undefined }>;
}

export function getConfiguredGoogleClientId(): string {
  const value = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!value) throw new Error('Google authentication is unavailable');
  return value;
}

function getConfiguredGoogleClientSecret(): string {
  const value = process.env.GOOGLE_OAUTH_CLIENT_SECRET_WEB?.trim();
  if (!value) throw new Error('Google authentication is unavailable');
  return value;
}

export function buildGoogleAuthorizationUrl(request: GoogleAuthorizationRequest): URL {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', request.clientId);
  url.searchParams.set('redirect_uri', request.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('state', request.state);
  url.searchParams.set('nonce', request.nonce);
  url.searchParams.set('code_challenge', request.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url;
}

export async function exchangeAndVerifyGoogleCode(
  input: {
    code: string;
    codeVerifier: string;
    clientId: string;
    redirectUri: string;
    nonce: string;
  },
  client?: GoogleOAuthClientLike
): Promise<GoogleIdentity> {
  const configuredClientId = getConfiguredGoogleClientId();
  if (input.clientId !== configuredClientId) {
    throw new Error('Google client ID mismatch');
  }

  const oauthClient = client ?? new OAuth2Client(
    configuredClientId,
    getConfiguredGoogleClientSecret(),
    input.redirectUri
  );
  const { tokens } = await oauthClient.getToken({
    code: input.code,
    codeVerifier: input.codeVerifier,
    client_id: configuredClientId,
    redirect_uri: input.redirectUri,
  });
  if (!tokens.id_token) throw new Error('Google ID token is missing');

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: configuredClientId,
  });
  const payload = ticket.getPayload();
  const nonce = (payload as (GoogleTokenPayload & { nonce?: string }) | undefined)?.nonce;
  if (!payload || !GOOGLE_ISSUERS.has(payload.iss || '')) {
    throw new Error('Google issuer is invalid');
  }
  if (payload.aud !== configuredClientId) {
    throw new Error('Google audience is invalid');
  }
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('Google ID token is expired');
  }
  if (nonce !== input.nonce) {
    throw new Error('Google nonce is invalid');
  }
  if (payload.email_verified !== true || !payload.email || !payload.sub) {
    throw new Error('Google verified identity is incomplete');
  }

  return {
    sub: payload.sub,
    email: payload.email.trim().normalize('NFKC').toLowerCase(),
  };
}
