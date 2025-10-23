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
export declare function createCosmosClient(): CosmosClient;
/**
 * Get database instance with target containers
 */
export declare function getTargetDatabase(cosmosClient: CosmosClient, databaseName?: string): {
    postsV2: import("@azure/cosmos").Container;
    userFeed: import("@azure/cosmos").Container;
    reactions: import("@azure/cosmos").Container;
    notifications: import("@azure/cosmos").Container;
    counters: import("@azure/cosmos").Container;
    publicProfiles: import("@azure/cosmos").Container;
    users: import("@azure/cosmos").Container;
    posts: import("@azure/cosmos").Container;
    flags: import("@azure/cosmos").Container;
    appeals: import("@azure/cosmos").Container;
};
/**
 * Cosmos factory for dependency injection
 */
export type CosmosFactory = () => CosmosClient;
export declare const defaultCosmosFactory: CosmosFactory;
//# sourceMappingURL=cosmos-client.d.ts.map