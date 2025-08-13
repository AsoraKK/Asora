/**
 * ASORA PRIVACY UTILITIES
 *
 * 🎯 Purpose: Shared utilities for GDPR/POPIA compliance
 * 🔐 Security: PII redaction, user data aggregation, content marking
 * 📊 Data: Cross-container queries with proper partitioning
 * 📱 Platform: Azure Functions with TypeScript + Cosmos DB
 */

import { InvocationContext } from '@azure/functions';
import { getContainer } from './cosmosClient';

/**
 * User data export structure
 */
export interface UserDataBundle {
  user: any;
  posts: any[];
  comments: any[];
  likes: any[];
  appeals: any[];
  votes: any[];
  flags: any[];
}

/**
 * Content update statistics
 */
export interface ContentUpdateStats {
  postsUpdated: number;
  commentsUpdated: number;
}

/**
 * Get all user data across all containers for export
 */
export async function getAllUserData(
  userId: string,
  context: InvocationContext
): Promise<UserDataBundle> {
  context.info(`Fetching user data for export: ${userId}`);

  try {
    // Fetch data from all containers in parallel
    const [user, posts, comments, likes, appeals, votes, flags] = await Promise.all([
      _fetchUserProfile(userId),
      _fetchUserPosts(userId),
      _fetchUserComments(userId),
      _fetchUserLikes(userId),
      _fetchUserAppeals(userId),
      _fetchUserVotes(userId),
      _fetchUserFlags(userId),
    ]);

    return {
      user,
      posts,
      comments,
      likes,
      appeals,
      votes,
      flags,
    };
  } catch (error) {
    context.error('Failed to fetch user data:', error);
    throw error;
  }
}

/**
 * Scrub PII fields from user document while preserving referential integrity
 */
export function scrubUserPII(user: any): any {
  if (!user) return user;

  const scrubbed = { ...user };

  // Scrub PII fields
  scrubbed.email = null;
  scrubbed.displayName = '[deleted]';
  scrubbed.bio = null;
  scrubbed.phone = null;
  scrubbed.profileImageUrl = null;

  // Keep id and timestamps for referential integrity and audit trail
  // Keep role and tier for system functionality

  return scrubbed;
}

/**
 * Mark user's authored content as deleted (preserves thread structure)
 */
export async function markUserContentAsDeleted(
  userId: string,
  context: InvocationContext
): Promise<ContentUpdateStats> {
  const stats: ContentUpdateStats = {
    postsUpdated: 0,
    commentsUpdated: 0,
  };

  try {
    // Update posts authored by user
    const postsContainer = getContainer('posts');
    const { resources: userPosts } = await postsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.authorId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    for (const post of userPosts) {
      post.authorDisplayName = '[deleted]';
      post.text = '[Content removed - user deleted]';
      post.deletedAt = new Date().toISOString();

      await postsContainer.item(post.id, post.id).replace(post);
      stats.postsUpdated++;
    }

    // Update comments authored by user
    const commentsContainer = getContainer('comments');
    const { resources: userComments } = await commentsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.authorId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    for (const comment of userComments) {
      comment.authorDisplayName = '[deleted]';
      comment.text = '[Content removed - user deleted]';
      comment.deletedAt = new Date().toISOString();

      await commentsContainer.item(comment.id, comment.postId).replace(comment);
      stats.commentsUpdated++;
    }

    context.info(
      `Content marked as deleted - Posts: ${stats.postsUpdated}, Comments: ${stats.commentsUpdated}`
    );
    return stats;
  } catch (error) {
    context.error('Failed to mark content as deleted:', error);
    throw error;
  }
}

/**
 * Redact PII from nested objects (e.g., other users' data in posts/comments)
 */
export function redactNestedPII(item: any): any {
  if (!item) return item;

  const redacted = { ...item };

  // Redact common nested PII fields
  if (redacted.authorEmail) {
    redacted.authorEmail = _redactEmail(redacted.authorEmail);
  }

  if (redacted.mentions) {
    redacted.mentions = redacted.mentions.map((mention: any) => ({
      ...mention,
      email: mention.email ? _redactEmail(mention.email) : undefined,
    }));
  }

  // Redact any embedded user objects
  if (redacted.author && typeof redacted.author === 'object') {
    redacted.author = redactUserForLogs(redacted.author);
  }

  return redacted;
}

/**
 * Redact user object for logging purposes
 */
export function redactUserForLogs(user: any): any {
  if (!user) return user;

  return {
    id: user.id,
    displayName: user.displayName ? _maskString(user.displayName) : undefined,
    role: user.role,
    tier: user.tier,
    createdAt: user.createdAt,
    // Exclude email, phone, bio, and other PII
  };
}

/**
 * Private helper functions
 */

async function _fetchUserProfile(userId: string): Promise<any> {
  const container = getContainer('users');
  const { resource } = await container.item(userId, userId).read();
  return resource;
}

async function _fetchUserPosts(userId: string): Promise<any[]> {
  const container = getContainer('posts');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

async function _fetchUserComments(userId: string): Promise<any[]> {
  const container = getContainer('comments');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

async function _fetchUserLikes(userId: string): Promise<any[]> {
  const container = getContainer('likes');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

async function _fetchUserAppeals(userId: string): Promise<any[]> {
  const container = getContainer('appeals');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

async function _fetchUserVotes(userId: string): Promise<any[]> {
  const container = getContainer('votes');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

async function _fetchUserFlags(userId: string): Promise<any[]> {
  const container = getContainer('flags');
  const { resources } = await container.items
    .query({
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources;
}

function _redactEmail(email: string): string {
  if (!email || !email.includes('@')) return '[redacted]';

  const [local, domain] = email.split('@');
  const maskedLocal =
    local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);

  return `${maskedLocal}@${domain}`;
}

function _maskString(str: string): string {
  if (!str || str.length < 3) return '*'.repeat(str.length);
  return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
}
