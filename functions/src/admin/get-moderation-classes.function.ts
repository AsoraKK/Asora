/**
 * GET /api/admin/moderation-classes
 * 
 * Returns all 29 Hive moderation classes with their current weights
 * (defaults + any admin customizations from Cosmos DB)
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { ALL_HIVE_CLASSES } from '../../shared/hive-classes-config';
import { loadModerationWeights } from '../../shared/moderation-weights-loader';
import { getAzureLogger } from '../../shared/azure-logger';

const logger = getAzureLogger('getModerationClasses');

export interface ClassWithCurrentWeight {
  id: string;
  name: string;
  description: string;
  apiType: 'text' | 'image' | 'deepfake';
  defaultWeight: number;
  currentWeight: number;
  minWeight: number;
  maxWeight: number;
  isCustomized: boolean;
  blockingGuidance: string;
}

export interface ModerationClassesResponse {
  success: boolean;
  data: {
    classes: ClassWithCurrentWeight[];
    summary: {
      total: number;
      byApiType: Record<string, number>;
      customized: number;
    };
  };
  timestamp: string;
}

async function getModerationClasses(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Verify admin access (would be implemented with proper auth middleware)
    // For now, we'll just check if the header exists as a placeholder
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      logger.warn('Unauthorized access to moderation classes endpoint');
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Unauthorized',
          message: 'Valid Bearer token required',
        },
      };
    }

    // Load current weights from Cosmos DB (if available)
    let currentWeights: Record<string, number> = {};
    try {
      const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
      if (cosmosConnectionString) {
        const cosmosClient = new CosmosClient(cosmosConnectionString);
        const database = cosmosClient.database('asora-db');
        const container = database.container('ModerationWeights');
        currentWeights = await loadModerationWeights(container);
        // eslint-disable-next-line no-console
        console.log('Weight overrides loaded from Cosmos DB');
      } else {
        logger.warn('COSMOS_CONNECTION_STRING not set, using defaults only');
      }
    } catch (error) {
      logger.error('Failed to load weights from Cosmos DB', { cause: error });
      // Fall back to defaults
    }

    // Build response with current weights
    const classesWithWeights: ClassWithCurrentWeight[] = ALL_HIVE_CLASSES.map(cls => {
      const currentWeight = currentWeights[cls.name] ?? cls.defaultWeight;
      const isCustomized = cls.name in currentWeights;

      return {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        apiType: cls.apiType,
        defaultWeight: cls.defaultWeight,
        currentWeight,
        minWeight: cls.minWeight,
        maxWeight: cls.maxWeight,
        isCustomized,
        blockingGuidance: cls.blockingGuidance,
      };
    });

    // Calculate summary
    const byApiType: Record<string, number> = { text: 0, image: 0, deepfake: 0 };
    let customizedCount = 0;

    for (const cls of classesWithWeights) {
      // byApiType[cls.apiType!]++; TypeScript guard
      (byApiType as any)[cls.apiType]++;
      if (cls.isCustomized) customizedCount++;
    }

    const response: ModerationClassesResponse = {
      success: true,
      data: {
        classes: classesWithWeights,
        summary: {
          total: classesWithWeights.length,
          byApiType,
          customized: customizedCount,
        },
      },
      timestamp: new Date().toISOString(),
    };

    // eslint-disable-next-line no-console
    console.log(`Retrieved ${classesWithWeights.length} moderation classes (${customizedCount} customized)`);

    return {
      status: 200,
      jsonBody: response,
    };
  } catch (error) {
    logger.error('Error retrieving moderation classes', { cause: error });
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve moderation classes',
      },
    };
  }
}

app.http('getModerationClasses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/moderation-classes',
  handler: getModerationClasses,
});

export default getModerationClasses;
