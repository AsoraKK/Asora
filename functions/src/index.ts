import { app } from '@azure/functions';

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check endpoint called');
        
        return {
            status: 200,
            jsonBody: {
                ok: true,
                timestamp: new Date().toISOString(),
                service: 'asora-functions'
            }
        };
    }
});

app.http('feed', {
    methods: ['GET'],
    authLevel: 'anonymous', 
    route: 'feed',
    handler: async (request, context) => {
        context.log('Feed endpoint called');
        
        return {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
            },
            jsonBody: {
                ok: true,
                timestamp: new Date().toISOString(),
                service: 'feed',
                data: { posts: [] }
            }
        };
    }
});
