import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { deleteUser } from '../deleteUser';

app.http('deleteUser', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'user/delete',
    handler: requireAuth(deleteUser as any)
});
