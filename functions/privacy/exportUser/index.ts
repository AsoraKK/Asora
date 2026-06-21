import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { exportUser } from '../exportUser';

app.http('exportUser', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'user/export',
    handler: requireAuth(exportUser as any)
});
