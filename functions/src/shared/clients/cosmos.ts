import { CosmosClient, Database } from '@azure/cosmos';

let cachedClient: CosmosClient | undefined;
let cachedDatabase: { name: string; database: Database } | undefined;

export function getCosmos(): CosmosClient {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('COSMOS_CONNECTION_STRING missing');
  }

  if (!cachedClient) {
    cachedClient = new CosmosClient(connectionString);
  }

  return cachedClient;
}

export function resetCosmosClient(): void {
  cachedClient = undefined;
  cachedDatabase = undefined;
}

export function getCosmosClient(): CosmosClient {
  return getCosmos();
}

export function createCosmosClient(): CosmosClient {
  return getCosmos();
}

export function getCosmosDatabase(
  databaseName = process.env.COSMOS_DATABASE_NAME || 'asora'
): Database {
  if (!cachedDatabase || cachedDatabase.name !== databaseName) {
    cachedDatabase = {
      name: databaseName,
      database: getCosmos().database(databaseName),
    };
  }

  return cachedDatabase.database;
}

export function getTargetDatabase(
  cosmosClient: CosmosClient = getCosmos(),
  databaseName = process.env.COSMOS_DATABASE_NAME || 'asora'
) {
  const database = cosmosClient.database(databaseName);

  return {
    postsV2: database.container('posts_v2'),
    userFeed: database.container('userFeed'),
    reactions: database.container('reactions'),
    notifications: database.container('notifications'),
    counters: database.container('counters'),
    publicProfiles: database.container('publicProfiles'),
      users: database.container('users'),
      profiles: database.container('profiles'),
    posts: database.container('posts'),
    customFeeds: database.container('custom_feeds'),
    flags: database.container('flags'),
    appeals: database.container('appeals'),
    appealVotes: database.container('appeal_votes'),
    moderationDecisions: database.container('moderation_decisions'),
    comments: database.container('comments'),
    messages: database.container('messages'),
    invites: database.container('invites'),
  };
}

export type CosmosFactory = () => CosmosClient;

export const defaultCosmosFactory: CosmosFactory = () => getCosmos();
