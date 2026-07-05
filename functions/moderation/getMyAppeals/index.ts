import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { getMyAppeals } from '../getMyAppeals';

app.http('getMyAppeals', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'moderation/my-appeals',
    handler: requireAuth(getMyAppeals as any)
});
