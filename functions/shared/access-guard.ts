import { HttpRequest, InvocationContext } from '@azure/functions';
import { requireUser, hasRole, HttpError } from './auth-utils';

export interface AccessGuardOptions {
  role?: string; // required role
  tier?: string; // required tier
  rateLimit?: {
    key: (req: HttpRequest, userId: string) => string;
    windowMs: number;
    max: number;
    check: (
      key: string
    ) => Promise<{ allowed: boolean; resetTime: number; remaining: number; limit: number }>;
  };
}

export type Handler = (req: HttpRequest, ctx: InvocationContext) => Promise<any>;

export function withAccessGuard(handler: Handler, opts: AccessGuardOptions = {}): Handler {
  return async (req, ctx) => {
    // 1) JWT (throws 401 on failure)
    const user = await requireUser(ctx, req);

    // 2) Active check
    if ((user as any).isActive === false) {
      throw new HttpError(403, { code: 'inactive_user', message: 'User is not active' });
    }

    // 3) Role
    if (opts.role && !hasRole(user as any, opts.role)) {
      throw new HttpError(403, { code: 'forbidden', message: 'Insufficient role' });
    }

    // 4) Tier
    if (opts.tier && (user as any).tier && (user as any).tier !== opts.tier) {
      throw new HttpError(403, { code: 'forbidden', message: 'Insufficient tier' });
    }

    // 5) Rate limit
    if (opts.rateLimit) {
      const key = opts.rateLimit.key(req, user.sub);
      const rl = await opts.rateLimit.check(key);
      if (!rl.allowed) {
        return {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': new Date(rl.resetTime).toISOString(),
          },
          jsonBody: {
            code: 'rate_limited',
            message: 'Rate limit exceeded',
            resetTime: rl.resetTime,
          },
        };
      }
    }

    return handler(req, ctx);
  };
}
