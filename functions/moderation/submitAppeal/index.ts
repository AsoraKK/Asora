import { app } from '@azure/functions';
import { submitAppeal } from '../submitAppeal';

app.http('submitAppeal', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'moderation/submit-appeal',
  handler: submitAppeal,
});
