import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { requireAdmin, type Principal } from '@shared/middleware/auth';

type AdminHandler = (
  req: HttpRequest & { principal: Principal },
  context: InvocationContext
) => Promise<HttpResponseInit> | HttpResponseInit;

function buildInactiveResponse(): HttpResponseInit {
  return {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'account_disabled',
      message: 'This admin account is disabled and cannot perform this action.',
    }),
  };
}

export function requireActiveAdmin(handler: AdminHandler): (
  req: HttpRequest,
  context: InvocationContext
) => Promise<HttpResponseInit> {
  return requireAdmin(async (req, context) => {
    const userId = (req as HttpRequest & { principal: Principal }).principal.sub;

    try {
      const database = getCosmosDatabase();
      const users = database.container('users');
      const { resource } = await users.item(userId, userId).read();
      if (!resource || resource.isActive === false) {
        context.log('auth.requireActiveAdmin.disabled', { userId });
        return buildInactiveResponse();
      }
    } catch (error) {
      context.log('auth.requireActiveAdmin.error', {
        userId,
        message: (error as Error).message,
      });
      return buildInactiveResponse();
    }

    return handler(req as HttpRequest & { principal: Principal }, context);
  });
}
