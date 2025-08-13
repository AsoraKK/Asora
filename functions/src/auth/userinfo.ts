/**
 * ASORA PLATFORM CONTEXT
 * 
 * Social network prioritizing authentic, human-created content
 * Stack: Azure Functions + TypeScript + Cosmos DB + Hive AI
 * 
 * USER TIERS:
 * - Free: 10 posts/day
 * - Premium: 100 posts/day  
 * - Enterprise: Unlimited posting
 * 
 * This endpoint returns comprehensive user profile information
 * for authenticated users, including stats and preferences.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';

export async function userInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        // 1. Validate JWT and extract user context
        const userContext = getUserContext(request);
        if (!userContext) {
            return { 
                status: 401, 
                jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' }
            };
        }

        // 2. Fetch user profile from Cosmos DB
        const usersContainer = getContainer('users');
        
        try {
            const { resource: user } = await usersContainer.item(userContext.userId, userContext.userId).read();

            if (!user) {
                context.warn(`User not found in database: ${userContext.userId}`);
                return {
                    status: 404,
                    jsonBody: { error: 'User profile not found' }
                };
            }

            // 3. Aggregate user statistics from related collections
            // TODO: Add queries to posts, comments, likes collections for stats
            const stats = {
                postsCount: user.stats?.postsCount || 0,
                commentsCount: user.stats?.commentsCount || 0,
                likesReceived: user.stats?.likesReceived || 0,
                flagsReceived: user.stats?.flagsReceived || 0
            };

            // 4. Return comprehensive user profile
            const userProfile = {
                id: user.id,
                email: user.email,
                role: user.role || 'user',
                tier: user.tier || 'free',
                reputationScore: user.reputation_score || 0,
                createdAt: user.created_at,
                lastActiveAt: user.lastActiveAt || user.created_at,
                profile: {
                    displayName: user.profile?.displayName || null,
                    bio: user.profile?.bio || null,
                    avatarUrl: user.profile?.avatarUrl || null,
                    location: user.profile?.location || null
                },
                stats,
                preferences: {
                    emailNotifications: user.preferences?.emailNotifications !== false,
                    contentFilters: user.preferences?.contentFilters || ['safe'],
                    privacyLevel: user.preferences?.privacyLevel || 'public'
                }
            };

            // 5. Extract token metadata
            const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
            const token = authHeader?.split(' ')[1];
            
            let tokenInfo = {};
            if (token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.decode(token) as any;
                    if (decoded) {
                        tokenInfo = {
                            issuedAt: new Date(decoded.iat * 1000).toISOString(),
                            expiresAt: new Date(decoded.exp * 1000).toISOString()
                        };
                    }
                } catch (tokenError) {
                    // Token info is optional, continue without it
                }
            }

            context.log(`✅ User profile returned for: ${user.email} (ID: ${user.id})`);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    user: userProfile,
                    tokenInfo
                }
            };

        } catch (dbError: any) {
            if (dbError.code === 404) {
                context.warn(`User not found in Cosmos DB: ${userContext.userId}`);
                return {
                    status: 404,
                    jsonBody: { error: 'User profile not found' }
                };
            }
            throw dbError; // Re-throw for general error handling
        }

    } catch (error: any) {
        context.error('User info error:', error);
        return {
            status: 500,
            jsonBody: { 
                error: 'Internal server error',
                message: 'Unable to fetch user profile'
            }
        };
    }
}

app.http('userInfo', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'auth/userinfo',
    handler: userInfo
});
