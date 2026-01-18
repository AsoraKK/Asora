/**
 * POST /api/admin/moderation-classes/{className}/reset
 * 
 * Reset a moderation class weight back to default
 * Deletes the override document from Cosmos DB
 * 
 * Request body: (empty)
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { getClassByName } from '../../shared/hive-classes-config';
import { resetWeightToDefault } from '../../shared/moderation-weights-loader';
import { getAzureLogger } from '../../shared/azure-logger';

const logger = getAzureLogger('resetWeightOverride');

export interface ResetWeightResponse {
  success: boolean;
  data?: {
    className: string;
    resetToDefault: number;
    resetAt: string;
  };
  error?: string;
  message?: string;
}

async function resetWeightHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify admin authorization
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      logger.info('Unauthorized POST attempt', { endpoint: 'reset-weight' });
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
          message: 'Valid Bearer token required',
        },
      };
    }

    // Extract className from route parameter
    const className = (context.triggerMetadata as any)?.className;
    if (!className || typeof className !== 'string') {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Invalid Request',
          message: 'Class name required in URL path',
        },
      };
    }

    // Look up class configuration
    const classConfig = getClassByName(className);
    if (!classConfig) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Not Found',
          message: `Unknown class: ${className}`,
        },
      };
    }

    // Reset to default in Cosmos DB
    try {
      const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
      if (!cosmosConnectionString) {
        throw new Error('COSMOS_CONNECTION_STRING not configured');
      }

      const cosmosClient = new CosmosClient(cosmosConnectionString);
      const database = cosmosClient.database('asora-db');
      const container = database.container('ModerationWeights');

      await resetWeightToDefault(container, className);

      const response: ResetWeightResponse = {
        success: true,
        data: {
          className,
          resetToDefault: classConfig.defaultWeight,
          resetAt: new Date().toISOString(),
        },
      };

      // eslint-disable-next-line no-console
      console.log(`Weight reset to default: ${className} = ${classConfig.defaultWeight}`);

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (dbError) {
      logger.error('Database error resetting weight', { context: 'reset-weight', cause: dbError });
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: 'Database Error',
          message: 'Failed to reset weight',
        },
      };
    }
  } catch (error) {
    logger.error('Error processing weight reset request', { context: 'reset-weight-request', cause: error });
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process request',
      },
    };
  }
}

app.http('resetWeightOverride', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/moderation-classes/{className}/reset',
  handler: resetWeightHandler,
});

export default resetWeightHandler;
