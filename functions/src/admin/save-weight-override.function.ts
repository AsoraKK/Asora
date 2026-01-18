/**
 * POST /api/admin/moderation-classes/weights
 * 
 * Save admin-customized weight for a moderation class to Cosmos DB
 * 
 * Request body:
 * {
 *   "className": "hate",
 *   "newWeight": 0.90,
 *   "reason": "Reducing false positives on political discussions"
 * }
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { getClassByName } from '../../shared/hive-classes-config';
import { saveWeightOverride } from '../../shared/moderation-weights-loader';
import { getAzureLogger } from '../../shared/azure-logger';

const logger = getAzureLogger('saveWeightOverride');

export interface SaveWeightRequest {
  className: string;
  newWeight: number;
  reason?: string;
}

export interface SaveWeightResponse {
  success: boolean;
  data?: {
    className: string;
    previousWeight: number;
    newWeight: number;
    minWeight: number;
    maxWeight: number;
    savedAt: string;
  };
  error?: string;
  message?: string;
}

async function saveWeightOverrideHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify admin authorization
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      logger.info('Unauthorized POST attempt', { endpoint: 'weight-override' });
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
          message: 'Valid Bearer token required',
        },
      };
    }

    // Extract admin user ID from token (placeholder - would use actual JWT parsing)
    const adminUserId = 'admin@lythaus.com'; // TODO: Extract from JWT

    // Parse request body
    let payload: SaveWeightRequest;
    try {
      const body = await req.json() as unknown;
      if (!body || typeof body !== 'object') {
        throw new Error('Invalid request body');
      }
      payload = body as SaveWeightRequest;
    } catch {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Invalid Request',
          message: 'Request body must be valid JSON',
        },
      };
    }

    // Validate required fields
    if (!payload.className || typeof payload.newWeight !== 'number') {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Invalid Request',
          message: 'Required: className (string), newWeight (number)',
        },
      };
    }

    // Look up class configuration
    const classConfig = getClassByName(payload.className);
    if (!classConfig) {
      return {
        status: 404,
        jsonBody: {
          success: false,
          error: 'Not Found',
          message: `Unknown class: ${payload.className}`,
        },
      };
    }

    // Validate weight is within bounds
    const { minWeight, maxWeight, defaultWeight } = classConfig;
    if (payload.newWeight < minWeight || payload.newWeight > maxWeight) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Validation Error',
          message: `Weight must be between ${minWeight} and ${maxWeight}`,
        },
      };
    }

    // Save to Cosmos DB
    try {
      const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
      if (!cosmosConnectionString) {
        throw new Error('COSMOS_CONNECTION_STRING not configured');
      }

      const cosmosClient = new CosmosClient(cosmosConnectionString);
      const database = cosmosClient.database('asora-db');
      const container = database.container('ModerationWeights');

      await saveWeightOverride(
        container,
        payload.className,
        payload.newWeight,
        adminUserId,
        payload.reason
      );

      const response: SaveWeightResponse = {
        success: true,
        data: {
          className: payload.className,
          previousWeight: defaultWeight,
          newWeight: payload.newWeight,
          minWeight,
          maxWeight,
          savedAt: new Date().toISOString(),
        },
      };

      // eslint-disable-next-line no-console
      console.log(`Weight override saved: ${payload.className} = ${payload.newWeight}`);

      return {
        status: 200,
        jsonBody: response,
      };
    } catch (dbError) {
      logger.error('Database error saving weight override', { context: 'save-weight-override', cause: dbError });
      return {
        status: 500,
        jsonBody: {
          success: false,
          error: 'Database Error',
          message: 'Failed to save weight override',
        },
      };
    }
  } catch (error) {
    logger.error('Error processing weight override request', { context: 'weight-override-request', cause: error });
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

app.http('saveWeightOverride', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/moderation-classes/weights',
  handler: saveWeightOverrideHandler,
});

export default saveWeightOverrideHandler;
