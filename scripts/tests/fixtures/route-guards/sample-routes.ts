import { app } from '@azure/functions';
import { withRateLimit } from '@http/withRateLimit';
import { requireAdmin } from '@shared/middleware/auth';

const wrappedWrite = withRateLimit(async () => ({ status: 200 }), () => null as any);
const wrappedRead = withRateLimit(async () => ({ status: 200 }), () => null as any);

const adminOnlyHandler = requireAdmin(async () => ({ status: 200 }));
const plainWrite = async () => ({ status: 200 });

app.http('ok_write', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'ok/write',
  handler: requireAdmin(wrappedWrite),
});

app.http('missing_rate_limit', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'missing/rate-limit',
  handler: adminOnlyHandler,
});

app.http('missing_auth_guard', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'missing/auth-guard',
  handler: plainWrite,
});

app.http('public_read', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'public/read',
  handler: wrappedRead,
});
