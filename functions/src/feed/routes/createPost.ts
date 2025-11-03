import { app, HttpRequest, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { badRequest, created, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

import type { CreatePostBody } from '@feed/types';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

export const createPost = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  const principal = req.principal;

  const payload = (await req.json().catch(() => null)) as CreatePostBody | null;
  if (!payload || typeof payload !== 'object') {
    context.log('posts.create.invalid_json');
    return badRequest('Invalid JSON payload');
  }

  try {
    // Defer service import to avoid module-level initialization
    const { createPost: createPostService } = await import('@feed/service/feedService');
    const result = await createPostService({ principal, payload, context });
    const response = created(result.body);
    response.headers = {
      ...response.headers,
      ...result.headers,
    };
    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
          ...(error.headers ?? {}),
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    context.log('posts.create.error', { message: (error as Error).message });
    return serverError();
  }
});

/* istanbul ignore next */
const rateLimitedCreatePost = withRateLimit(createPost, (req, context) => getPolicyForFunction('createPost'));

app.http('createPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'post',
  handler: rateLimitedCreatePost,
});
