/**
 * ASORA GDPR/POPIA DATA EXPORT ENDPOINT
 * 
 * 🎯 Purpose: Export user's complete data bundle in JSON format
 * 🔐 Security: JWT auth, rate limiting (1 export per 24h), PII redaction
 * 📊 Telemetry: privacy_export_requested/completed/failed events
 * 📱 Platform: Azure Functions with TypeScript + Cosmos DB
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../shared/auth';
import { getAllUserData, redactNestedPII } from '../shared/privacy';
import { getRedisClient } from '../shared/redisClient';

interface ExportBundle {
  user: any;
  posts: any[];
  comments: any[];
  likes: any[];
  appeals: any[];
  votes: any[];
  flags: any[];
  generatedAt: string;
}

export async function exportUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    // Authenticate user
    const user = requireAuth(request);
    const userId = user.sub;

    context.info(`Privacy export requested by user: ${userId}`);

    // Check rate limiting (1 export per 24h)
    const redis = await getRedisClient();
    if (redis) {
      const rateLimitKey = `export_rate_limit:${userId}`;
      const lastExport = await redis.get(rateLimitKey);
      
      if (lastExport) {
        const lastExportTime = new Date(lastExport).getTime();
        const hoursSinceLastExport = (Date.now() - lastExportTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastExport < 24) {
          const retryAfterSeconds = Math.ceil((24 - hoursSinceLastExport) * 3600);
          
          // Log rate limit hit
          context.warn(`Export rate limit hit for user: ${userId}`);
          _logTelemetryEvent(context, 'privacy_export_rate_limited', userId, 0, Date.now() - startTime);
          
          return {
            status: 429,
            jsonBody: { 
              error: 'Export rate limit exceeded',
              code: 'PRIVACY_RATE_LIMITED',
              retryAfterSeconds
            },
            headers: {
              'Retry-After': retryAfterSeconds.toString()
            }
          };
        }
      }
    }

    // Fetch all user data from all containers
    const userData = await getAllUserData(userId, context);
    
    // Build export bundle with PII redaction for nested objects
    const exportBundle: ExportBundle = {
      user: userData.user,
      posts: userData.posts.map(redactNestedPII),
      comments: userData.comments.map(redactNestedPII),
      likes: userData.likes,
      appeals: userData.appeals,
      votes: userData.votes,
      flags: userData.flags,
      generatedAt: new Date().toISOString(),
    };

    // Count total items for telemetry
    const totalItems = Object.values(exportBundle)
      .reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 1), -1); // -1 for generatedAt

    // Update rate limit
    if (redis) {
      const rateLimitKey = `export_rate_limit:${userId}`;
      await redis.setex(rateLimitKey, 24 * 60 * 60, new Date().toISOString()); // 24 hour expiry
    }

    // Log successful export
    _logTelemetryEvent(context, 'privacy_export_completed', userId, totalItems, Date.now() - startTime);
    
    return {
      status: 200,
      jsonBody: exportBundle,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="asora-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      }
    };

  } catch (error: any) {
    context.error('Privacy export failed:', error);
    
    // Extract userId for telemetry if available
    let userId = 'unknown';
    try {
      const user = requireAuth(request);
      userId = user.sub;
    } catch {
      // Auth failed, keep unknown
    }
    
    _logTelemetryEvent(context, 'privacy_export_failed', userId, 0, Date.now() - startTime);
    
    if (error.status) {
      return {
        status: error.status,
        jsonBody: { 
          error: error.message,
          code: error.code || 'PRIVACY_EXPORT_ERROR'
        }
      };
    }

    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        code: 'PRIVACY_EXPORT_FAILED'
      }
    };
  }
}

/**
 * Log telemetry event for privacy operations
 */
function _logTelemetryEvent(
  context: InvocationContext, 
  event: string, 
  userId: string, 
  itemCount: number, 
  durationMs: number
): void {
  const telemetryData = {
    event,
    userId: userId.substring(0, 8) + '...', // Truncated for privacy
    itemCount,
    durationMs,
    timestamp: new Date().toISOString()
  };
  
  context.info(`TELEMETRY: ${JSON.stringify(telemetryData)}`);
  
  // TODO: Send to Application Insights with proper structured logging
  // ApplicationInsights.defaultClient?.trackEvent({
  //   name: event,
  //   properties: telemetryData
  // });
}

app.http('exportUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'user/export',
  handler: exportUser
});
