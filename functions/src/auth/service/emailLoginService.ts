import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { issueTokensForPgUser } from './tokenService';
import { usersService } from './usersService';
import { createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { validateRequestSize, validateText } from '@shared/utils/validate';
import { getAzureLogger, logAuthAttempt } from '@shared/utils/logger';

const logger = getAzureLogger('auth/email');
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailLoginBody = {
  email?: unknown;
  password?: unknown;
  client_id?: unknown;
};

type IdentityPasswordResponse = {
  localId?: string;
  email?: string;
  idToken?: string;
};

type IdentityAccount = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
};

type IdentityLookupResponse = {
  users?: IdentityAccount[];
};

function identityPlatformApiKey(): string {
  const value = process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY?.trim();
  if (!value) {
    throw new Error('Identity Platform email authentication is not configured');
  }
  return value;
}

function resolveClientId(requested: unknown): string | null {
  const allowed = (process.env.JWT_AUDIENCE || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const candidate = typeof requested === 'string' && requested.trim()
    ? requested.trim()
    : allowed[0] || 'lythaus-web';
  if (!validateText(candidate, 1, 100).valid) return null;
  if (allowed.length > 0 && !allowed.includes(candidate)) return null;
  return candidate;
}

async function verifyIdentityPlatformPassword(
  email: string,
  password: string
): Promise<IdentityAccount | null> {
  const apiKey = identityPlatformApiKey();
  const response = await fetch(IDENTITY_TOOLKIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 400 || response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Identity Platform authentication failed with status ${response.status}`);
  }
  const signIn = (await response.json()) as IdentityPasswordResponse;
  if (!signIn.idToken) {
    return null;
  }

  const lookup = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({ idToken: signIn.idToken }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!lookup.ok) {
    throw new Error(`Identity Platform account verification failed with status ${lookup.status}`);
  }
  const verified = (await lookup.json()) as IdentityLookupResponse;
  return verified.users?.[0] || null;
}

export async function emailLoginHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as EmailLoginBody;
    const size = validateRequestSize(body);
    if (!size.valid) {
      return createErrorResponse(400, size.error || 'Invalid request size');
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const clientId = resolveClientId(body.client_id);
    if (!EMAIL_PATTERN.test(email) || !validateText(email, 3, 254).valid) {
      return createErrorResponse(400, 'Invalid email');
    }
    if (!validateText(password, 8, 256).valid || !clientId) {
      return createErrorResponse(400, 'Invalid credentials');
    }

    const identity = await verifyIdentityPlatformPassword(email, password);
    if (!identity?.localId || !identity.email || !identity.emailVerified) {
      logAuthAttempt(logger, false, 'email', 'Invalid or unverified credentials', context.invocationId);
      return createErrorResponse(401, 'Invalid credentials');
    }

    const internalUser = await usersService.getUserByEmail(identity.email.trim().toLowerCase());
    if (!internalUser) {
      return createErrorResponse(403, 'Awaiting invite');
    }

    const existingLink = await usersService.getProviderLink('password', identity.localId);
    if (existingLink && existingLink.user_id !== internalUser.id) {
      logger.error('Identity provider link mismatch', { requestId: context.invocationId });
      return createErrorResponse(403, 'Account link conflict');
    }
    if (!existingLink) {
      await usersService.createProviderLink('password', identity.localId, internalUser.id);
    }

    const tokens = await issueTokensForPgUser(internalUser, clientId, context.invocationId);
    return createSuccessResponse(tokens, {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    });
  } catch (error) {
    logger.error('Email authentication failed', {
      requestId: context.invocationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return createErrorResponse(503, 'Email authentication unavailable');
  }
}
