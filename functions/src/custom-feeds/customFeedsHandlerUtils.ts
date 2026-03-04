import type { HttpHandlerContext } from '@shared/http/handler';
import type { HttpResponseInit } from '@azure/functions';
import { HttpError } from '@shared/utils/errors';

export function mapHttpErrorToResponse(
  ctx: HttpHandlerContext,
  error: unknown
): HttpResponseInit | undefined {
  if (!(error instanceof HttpError)) {
    return undefined;
  }

  const message = error.message || 'An error occurred';

  switch (error.status) {
    case 400:
      return ctx.badRequest(message);
    case 401:
      return ctx.unauthorized(message);
    case 403:
      return ctx.forbidden(message);
    case 404:
      return ctx.notFound(message);
    default:
      return ctx.internalError(error);
  }
}
