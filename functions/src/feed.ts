import { app } from '@azure/functions';
import { getFeed } from './feed/get';

app.http('feed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed',
  handler: getFeed,
});
