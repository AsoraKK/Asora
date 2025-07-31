/**
 * Shared Cosmos DB Client Helper for Asora Azure Functions
 * 
 * This module provides a centralized Cosmos DB client and container access
 * for all Asora backend functions.
 */

import { CosmosClient, Container } from '@azure/cosmos';

// Cosmos DB configuration
const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = 'asora-db';

// Initialize Cosmos client
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

/**
 * Get a specific container from the Asora database
 * @param containerId - Name of the container (users, posts, comments, etc.)
 * @returns Cosmos Container instance
 */
export function getContainer(containerId: string): Container {
  return database.container(containerId);
}

/**
 * Available containers in Asora database
 */
export const CONTAINERS = {
  USERS: 'users',
  POSTS: 'posts', 
  COMMENTS: 'comments',
  LIKES: 'likes',
  FEEDS: 'feeds',
  FLAGS: 'flags',
  REPUTATION: 'reputation'
} as const;

/**
 * Helper to create a new document with common fields
 * @param data - Document data
 * @returns Document with id, createdAt, and updatedAt fields
 */
export function createDocument(data: any) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

/**
 * Generate a unique ID for documents
 * @returns UUID-like string
 */
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
