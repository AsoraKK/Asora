const mockEmailAuthService = {
  register: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  login: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('@azure/functions', () => ({ app: { http: jest.fn() } }));
jest.mock('@shared/http/handler', () => ({
  httpHandler: (handler: unknown) => handler,
}));
jest.mock('@http/withRateLimit', () => ({
  withRateLimit: (handler: unknown) => handler,
}));
jest.mock('@rate-limit/policies', () => ({
  getPolicyForFunction: jest.fn(() => ({ limit: 10, windowSeconds: 60 })),
}));
jest.mock('@auth/service/emailAuthService', () => {
  const actual = jest.requireActual('@auth/service/emailAuthService');
  return {
    ...actual,
    EmailAuthService: jest.fn(() => mockEmailAuthService),
  };
});

import { EmailAuthError } from '@auth/service/emailAuthService';
import {
  registerHandler,
  verifyHandler,
  resendHandler,
  loginHandler,
  forgotHandler,
  resetHandler,
} from '@auth/routes/email_auth.function';

function context(method = 'POST', body: Record<string, unknown> = {}) {
  const error = jest.fn();
  return {
    request: { method },
    body,
    correlationId: 'email-route-test',
    context: { error },
    ok: (value: unknown, status = 200) => ({ status, jsonBody: value }),
    noContent: () => ({ status: 204 }),
    badRequest: (message: string, code: string) => ({
      status: 400,
      jsonBody: { error: code, message },
    }),
    unauthorized: (message: string, code: string) => ({
      status: 401,
      jsonBody: { error: code, message },
    }),
    forbidden: (message: string, code: string) => ({
      status: 403,
      jsonBody: { error: code, message },
    }),
    internalError: (message: string) => ({
      status: 500,
      jsonBody: { error: 'INTERNAL_ERROR', message },
    }),
  };
}

function expectPrivateNoStore(response: any, status: number) {
  expect(response.status).toBe(status);
  expect(response.headers).toMatchObject({
    'Cache-Control': 'private, no-store',
    Pragma: 'no-cache',
  });
}

describe('email authentication routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles preflight without calling the service', async () => {
    const response = await registerHandler(context('OPTIONS') as never);
    expect(response).toEqual({ status: 204 });
    expect(mockEmailAuthService.register).not.toHaveBeenCalled();
  });

  it('routes registration and resend requests with private responses', async () => {
    mockEmailAuthService.register.mockResolvedValueOnce({ message: 'accepted' });
    mockEmailAuthService.resendVerification.mockResolvedValueOnce({ message: 'accepted' });

    const registration = await registerHandler(
      context('POST', { email: 'user@example.com', password: 'Example-password-123' }) as never
    );
    const resend = await resendHandler(context('POST', { email: 'user@example.com' }) as never);

    expect(mockEmailAuthService.register).toHaveBeenCalledWith(
      'user@example.com',
      'Example-password-123'
    );
    expect(mockEmailAuthService.resendVerification).toHaveBeenCalledWith('user@example.com');
    expectPrivateNoStore(registration, 202);
    expectPrivateNoStore(resend, 202);
  });

  it('routes verification, login, forgot, and reset requests', async () => {
    mockEmailAuthService.verifyEmail.mockResolvedValueOnce({ message: 'verified' });
    mockEmailAuthService.login.mockResolvedValueOnce({ access_token: 'test-access' });
    mockEmailAuthService.forgotPassword.mockResolvedValueOnce({ message: 'accepted' });
    mockEmailAuthService.resetPassword.mockResolvedValueOnce({ message: 'reset' });

    const verification = await verifyHandler(context('POST', { token: 'verify-token' }) as never);
    const login = await loginHandler(
      context('POST', { email: 'user@example.com', password: 'Example-password-123' }) as never
    );
    const forgot = await forgotHandler(context('POST', { email: 'user@example.com' }) as never);
    const reset = await resetHandler(
      context('POST', { token: 'reset-token', new_password: 'New-password-123' }) as never
    );

    expect(mockEmailAuthService.verifyEmail).toHaveBeenCalledWith('verify-token');
    expect(mockEmailAuthService.login).toHaveBeenCalledWith(
      'user@example.com',
      'Example-password-123'
    );
    expect(mockEmailAuthService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    expect(mockEmailAuthService.resetPassword).toHaveBeenCalledWith(
      'reset-token',
      'New-password-123'
    );
    for (const response of [verification, login, forgot, reset]) {
      expectPrivateNoStore(response, response === forgot ? 202 : 200);
    }
  });

  it.each([
    [new EmailAuthError('INVALID_CREDENTIALS', 'Invalid credentials', 401), 401],
    [new EmailAuthError('EMAIL_NOT_VERIFIED', 'Verify your email', 403), 403],
    [new EmailAuthError('INVALID_REQUEST', 'Invalid request', 400), 400],
  ])('maps controlled service errors without cacheability', async (error, status) => {
    mockEmailAuthService.login.mockRejectedValueOnce(error);
    const response = await loginHandler(context() as never);
    expectPrivateNoStore(response, status);
    expect(response.jsonBody.error).toBe(error.code);
  });

  it('conceals unexpected failures and records only the correlation identifier', async () => {
    mockEmailAuthService.verifyEmail.mockRejectedValueOnce(new Error('provider detail'));
    const ctx = context();
    const response = await verifyHandler(ctx as never);

    expectPrivateNoStore(response, 500);
    expect(response.jsonBody.message).toBe('Email authentication is temporarily unavailable');
    expect(ctx.context.error).toHaveBeenCalledWith('[auth/email] request failed', {
      correlationId: 'email-route-test',
    });
  });
});
