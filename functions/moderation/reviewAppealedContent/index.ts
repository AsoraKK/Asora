import { app } from '@azure/functions';
import { reviewAppealedContent } from '../reviewAppealedContent';

app.http('reviewAppealedContent', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'moderation/review-queue',
  handler: reviewAppealedContent,
});
