// Cosmos DB Client Configuration
// Target architecture: Endpoint+Key with Session consistency

import { CosmosClient, CosmosClientOptions, ConsistencyLevel, Database } from '@azure/cosmos';

export interface CosmosConfig {
  endpoint?: string;
  key?: string;
  connectionString?: string;
  databaseName?: string;
  consistencyLevel?: ConsistencyLevel;
}

const defaultConnectionPolicy: CosmosClientOptions['connectionPolicy'] = {
  requestTimeout: 30000, // 30 seconds
  enableEndpointDiscovery: true,
  retryOptions: {
    maxRetryAttemptCount: 5,
    fixedRetryIntervalInMilliseconds: 1000,
    maxWaitTimeInSeconds: 60,
  },
};

let cachedClient: CosmosClient | null = null;
let cachedDatabase: { name: string; database: Database } | null = null;

function createClientFromEnvironment(): CosmosClient {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (connectionString && connectionString.trim().length > 0) {
    return new CosmosClient(connectionString);
  }

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;

  if (!endpoint || !key) {
    if (process.env.NODE_ENV === 'test') {
      return new CosmosClient({
        endpoint: 'http://localhost',
        key: 'test-key',
      });
    }

    throw new Error(
      'Missing Cosmos DB configuration. Provide COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT and COSMOS_KEY.'
    );
  }

  const options: CosmosClientOptions = {
    endpoint,
    key,
    consistencyLevel: 'Session',
    connectionPolicy: defaultConnectionPolicy,
  };

  return new CosmosClient(options);
}

export function getCosmosClient(): CosmosClient {
  if (!cachedClient) {
    cachedClient = createClientFromEnvironment();
  }
  return cachedClient;
}

/**
 * Exposed for compatibility; now returns a cached client instance.
 */
export function createCosmosClient(): CosmosClient {
  return getCosmosClient();
}
export function resetCosmosClient(): void {
  cachedClient = null;
  cachedDatabase = null;
}

export function getCosmosDatabase(
  databaseName = process.env.COSMOS_DATABASE_NAME || 'asora'
): Database {
  if (!cachedDatabase || cachedDatabase.name !== databaseName) {
    cachedDatabase = {
      name: databaseName,
      database: getCosmosClient().database(databaseName),
    };
  }
  return cachedDatabase.database;
}

/**
 * Get database instance with target containers
 */
export function getTargetDatabase(
  cosmosClient: CosmosClient = getCosmosClient(),
  databaseName = process.env.COSMOS_DATABASE_NAME || 'asora'
) {
  const database = cosmosClient.database(databaseName);

  return {
    // Target containers with correct partition keys
    postsV2: database.container('posts_v2'), // pk: /postId
    userFeed: database.container('userFeed'), // pk: /recipientId
    reactions: database.container('reactions'), // pk: /postId
    notifications: database.container('notifications'), // pk: /recipientId
    counters: database.container('counters'), // pk: /subjectId
    publicProfiles: database.container('publicProfiles'), // pk: /userId

    // Legacy containers (for migration period)
    users: database.container('users'),
    posts: database.container('posts'),
    flags: database.container('flags'),
    appeals: database.container('appeals'),
  };
}

/**
 * Cosmos factory for dependency injection
 */
export type CosmosFactory = () => CosmosClient;

export const defaultCosmosFactory: CosmosFactory = () => getCosmosClient();
