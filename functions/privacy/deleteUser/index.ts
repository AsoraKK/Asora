import { app } from '@azure/functions';
import { deleteUser } from '../deleteUser';

app.http('deleteUser', {
    methods: ['POST'],
    authLevel: 'function',
    route: 'user/delete',
    handler: deleteUser
});
