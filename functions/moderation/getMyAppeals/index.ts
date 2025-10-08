import { app } from '@azure/functions';
import { getMyAppeals } from '../getMyAppeals';

app.http('getMyAppeals', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'moderation/my-appeals',
  handler: getMyAppeals,
});
