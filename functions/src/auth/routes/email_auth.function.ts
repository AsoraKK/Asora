import { app } from '@azure/functions';

import { httpHandler, type HttpHandlerContext } from '@shared/http/handler';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { EmailAuthError, EmailAuthService } from '@auth/service/emailAuthService';

type EmailPasswordBody = { email?: string; password?: string; action_target?: unknown };
type TokenBody = { token?: string };
type ResetBody = { token?: string; new_password?: string };
type EmailOnlyBody = { email?: string; action_target?: unknown };

function privateNoStore(response: ReturnType<HttpHandlerContext<unknown>['ok']>) {
  return {
    ...response,
    headers: {
      ...(response.headers || {}),
      'Cache-Control': 'private, no-store',
      Pragma: 'no-cache',
    },
  };
}

function respondToError(ctx: HttpHandlerContext<unknown>, error: unknown) {
  if (error instanceof EmailAuthError) {
    if (error.status === 401) return privateNoStore(ctx.unauthorized(error.message, error.code));
    if (error.status === 403) return privateNoStore(ctx.forbidden(error.message, error.code));
    if (error.status === 429) return privateNoStore(ctx.tooManyRequests(error.message, error.code));
    if (error.status >= 500) {
      return privateNoStore({
        status: 503,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          error: {
            code: error.code,
            message: error.message,
            correlationId: ctx.correlationId,
            retryable: true,
          },
        },
      } as ReturnType<HttpHandlerContext<unknown>['ok']>);
    }
    return privateNoStore(ctx.badRequest(error.message, error.code));
  }
  ctx.context.error('[auth/email] request failed', { correlationId: ctx.correlationId });
  return privateNoStore({
    status: 503,
    headers: { 'Content-Type': 'application/json' },
    jsonBody: {
      error: {
        code: 'EMAIL_AUTH_TEMPORARILY_UNAVAILABLE',
        message: 'Email authentication is temporarily unavailable',
        correlationId: ctx.correlationId,
        retryable: true,
      },
    },
  } as ReturnType<HttpHandlerContext<unknown>['ok']>);
}

function isPreflight(ctx: HttpHandlerContext<unknown>): boolean {
  return ctx.request.method.toUpperCase() === 'OPTIONS';
}

const registerHandler = httpHandler<EmailPasswordBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  try {
    const result = await new EmailAuthService().register(
      ctx.body?.email || '',
      ctx.body?.password || '',
      ctx.body?.action_target
    );
    return privateNoStore(ctx.ok(result, 202));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

const verifyHandler = httpHandler<TokenBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  if ('token' in ctx.query) {
    return privateNoStore(ctx.badRequest('Verification token must be sent in the request body', 'INVALID_REQUEST'));
  }
  try {
    return privateNoStore(ctx.ok(await new EmailAuthService().verifyEmail(ctx.body?.token || '')));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

const resendHandler = httpHandler<EmailOnlyBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  try {
    return privateNoStore(ctx.ok(
      await new EmailAuthService().resendVerification(ctx.body?.email || '', ctx.body?.action_target),
      202
    ));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

const loginHandler = httpHandler<EmailPasswordBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  try {
    return privateNoStore(ctx.ok(
      await new EmailAuthService().login(ctx.body?.email || '', ctx.body?.password || '')
    ));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

const forgotHandler = httpHandler<EmailOnlyBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  try {
    return privateNoStore(ctx.ok(await new EmailAuthService().forgotPassword(ctx.body?.email || '', ctx.body?.action_target), 202));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

const resetHandler = httpHandler<ResetBody>(async (ctx) => {
  if (isPreflight(ctx)) return ctx.noContent();
  if ('token' in ctx.query) {
    return privateNoStore(ctx.badRequest('Reset token must be sent in the request body', 'INVALID_REQUEST'));
  }
  try {
    return privateNoStore(ctx.ok(
      await new EmailAuthService().resetPassword(
        ctx.body?.token || '',
        ctx.body?.new_password || ''
      )
    ));
  } catch (error) {
    return respondToError(ctx, error);
  }
});

function register(name: string, route: string, handler: ReturnType<typeof httpHandler>): void {
  app.http(name, {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route,
    handler: withRateLimit(handler, () => getPolicyForFunction(name.replace(/_/g, '-'))),
  });
}

register('auth_email_register', 'auth/email/register', registerHandler);
register('auth_email_verify', 'auth/email/verify', verifyHandler);
register('auth_email_resend', 'auth/email/resend', resendHandler);
register('auth_email_login', 'auth/email/login', loginHandler);
register('auth_email_forgot_password', 'auth/email/forgot-password', forgotHandler);
register('auth_email_reset_password', 'auth/email/reset-password', resetHandler);

export {
  registerHandler,
  verifyHandler,
  resendHandler,
  loginHandler,
  forgotHandler,
  resetHandler,
};
