import { app } from '@azure/functions';
import { flagContent } from '../flagContent';

app.http('flagContent', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'moderation/flag-content',
  handler: flagContent,
});
