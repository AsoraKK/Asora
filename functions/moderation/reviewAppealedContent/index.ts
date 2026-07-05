import { app } from '@azure/functions';
import { requireModerator } from '../../src/shared/middleware/auth';
import { reviewAppealedContent } from '../reviewAppealedContent';

app.http('reviewAppealedContent', {
    methods: ['GET'],
    authLevel: 'function',
    route: 'moderation/review-queue',
    handler: requireModerator(reviewAppealedContent as any)
});
