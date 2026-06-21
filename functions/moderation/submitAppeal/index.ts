import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { submitAppeal } from '../submitAppeal';

app.http('submitAppeal', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/submit-appeal',
    handler: requireAuth(submitAppeal as any)
});
