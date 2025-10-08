import { app } from '@azure/functions';
import { exportUser } from '../exportUser';

app.http('exportUser', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'user/export',
  handler: exportUser,
});
