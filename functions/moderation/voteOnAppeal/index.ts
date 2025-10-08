import { app } from '@azure/functions';
import { voteOnAppeal } from '../voteOnAppeal';

app.http('voteOnAppeal', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'moderation/vote-appeal',
  handler: voteOnAppeal,
});
