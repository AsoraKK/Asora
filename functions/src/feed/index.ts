import { app } from '@azure/functions';
import { getFeed } from './get';

// Register the feed HTTP trigger directly so the v4 runtime discovers it
app.http('feed', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feed',
  handler: getFeed
});

