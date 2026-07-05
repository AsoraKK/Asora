import { app } from '@azure/functions';
import { requireAuth } from '../../src/shared/middleware/auth';
import { voteOnAppeal } from '../voteOnAppeal';

app.http('voteOnAppeal', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'moderation/vote-appeal',
    handler: requireAuth(voteOnAppeal as any)
});
