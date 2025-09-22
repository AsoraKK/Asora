// Cosmos DB Client Configuration
// Target architecture: Endpoint+Key with Session consistency

import { CosmosClient, ConsistencyLevel } from '@azure/cosmos';

export interface CosmosConfig {
  endpoint: string;
  key: string;
  databaseName: string;
  consistencyLevel?: ConsistencyLevel;
}

/**
 * Create Cosmos client with production retry configuration
 */
export function createCosmosClient(): CosmosClient {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  
  if (!endpoint || !key) {
    throw new Error('Missing required Cosmos DB environment variables');
  }

  return new CosmosClient({
    endpoint,
    key,
    consistencyLevel: 'Session',
    
    // Production retry configuration
    connectionPolicy: {
      requestTimeout: 30000, // 30 seconds
      enableEndpointDiscovery: true,
      retryOptions: {
        maxRetryAttemptCount: 5,
        fixedRetryIntervalInMilliseconds: 1000,
        maxWaitTimeInSeconds: 60
      }
    }
  });
}

/**
 * Get database instance with target containers
 */
export function getTargetDatabase(cosmosClient: CosmosClient, databaseName = 'asora') {
  const database = cosmosClient.database(databaseName);
  
  return {
    // Target containers with correct partition keys
    postsV2: database.container('posts_v2'),           // pk: /postId
    userFeed: database.container('userFeed'),          // pk: /recipientId
    reactions: database.container('reactions'),        // pk: /postId
    notifications: database.container('notifications'), // pk: /recipientId
    counters: database.container('counters'),          // pk: /subjectId
    publicProfiles: database.container('publicProfiles'), // pk: /userId
    
    // Legacy containers (for migration period)
    users: database.container('users'),
    posts: database.container('posts'),
    flags: database.container('flags'),
    appeals: database.container('appeals')
  };
}

/**
 * Cosmos factory for dependency injection
 */
export type CosmosFactory = () => CosmosClient;

export const defaultCosmosFactory: CosmosFactory = () => createCosmosClient();