import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { flagContent } from '../flagContent';

app.http('flagContent', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/flag-content',
    handler: requireAuth(flagContent as any)
});
