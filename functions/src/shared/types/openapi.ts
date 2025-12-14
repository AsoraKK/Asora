/**
 * OpenAPI Types (Generated from docs/openapi.yaml)
 * 
 * This file contains TypeScript interfaces for all OpenAPI request/response schemas.
 * Used by Azure Functions handlers for type-safe request handling.
 * 
 * DO NOT EDIT MANUALLY - Regenerate from OpenAPI spec when schemas change.
 */

// ============================================================================
// Error Response (Standard)
// ============================================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// Auth Domain
// ============================================================================

export interface AuthTokenRequest {
  grant_type: 'authorization_code' | 'magic_link';
  code?: string;
  provider?: 'google' | 'apple' | 'email';
  redirect_uri?: string;
  code_verifier?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: UserProfile;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

// ============================================================================
// Users Domain
// ============================================================================

export interface UserProfile {
  id: string;
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  tier: string;
  roles: string[];
  reputation?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

export interface PublicUserProfile {
  id: string;
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  tier: string;
  reputation?: number;
  badges?: string[];
}

// ============================================================================
// Posts Domain
// ============================================================================

export interface CreatePostRequest {
  content: string;
  contentType: 'text' | 'image' | 'video' | 'mixed';
  mediaUrls?: string[];
  topics?: string[];
  visibility?: 'public' | 'followers' | 'private';
  isNews?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  contentType: 'text' | 'image' | 'video' | 'mixed';
  mediaUrls?: string[];
  topics?: string[];
  visibility: 'public' | 'followers' | 'private';
  isNews: boolean;
  clusterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostView extends Post {
  author: PublicUserProfile;
  authorRole: 'journalist' | 'contributor' | 'user';
  likeCount: number;
  commentCount: number;
  bookmarkCount?: number;
  viewCount?: number;
  viewerHasLiked?: boolean;
  viewerHasBookmarked?: boolean;
  viewerFollowsAuthor?: boolean;
  authorFollowerCount?: number;
  recentComments?: Array<{
    commentId: string;
    authorId: string;
    text: string;
    createdAt: string;
  }>;
  badges?: string[];
}

export interface CursorPaginatedPostView {
  items: PostView[];
  nextCursor?: string;
}

// ============================================================================
// Custom Feeds Domain
// ============================================================================

export type ContentType = 'text' | 'image' | 'video' | 'mixed';
export type SortingRule = 'hot' | 'new' | 'relevant' | 'following' | 'local';

export interface CustomFeedDefinition {
  id: string;
  ownerId: string;
  name: string;
  contentType: ContentType;
  sorting: SortingRule;
  includeKeywords: string[];
  excludeKeywords: string[];
  includeAccounts: string[];
  excludeAccounts: string[];
  isHome: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFeedRequest {
  name: string;
  contentType: ContentType;
  sorting: SortingRule;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  includeAccounts?: string[];
  excludeAccounts?: string[];
  isHome?: boolean;
}

export interface UpdateCustomFeedRequest {
  name?: string;
  contentType?: ContentType;
  sorting?: SortingRule;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  includeAccounts?: string[];
  excludeAccounts?: string[];
  isHome?: boolean;
}

export interface CustomFeedListResponse {
  items: CustomFeedDefinition[];
  nextCursor?: string;
}

// ============================================================================
// Moderation Domain
// ============================================================================

export interface ModerationCase {
  id: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  reason: string;
  aiConfidence?: number;
  reporterIds: string[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: string;
  updatedAt: string;
}

export interface ModerationDecision {
  id: string;
  caseId: string;
  userId: string;
  action: 'approve' | 'reject' | 'escalate';
  rationale?: string;
  createdAt: string;
}

export interface ModerationCaseListResponse {
  items: ModerationCase[];
  nextCursor?: string;
}

export interface ModerationCaseResponse {
  case: ModerationCase;
  decisions: ModerationDecision[];
  targetContent?: unknown;
}

export interface ModerationDecisionRequest {
  action: 'approve' | 'reject' | 'escalate';
  rationale?: string;
}

// ============================================================================
// Appeals Domain
// ============================================================================

export interface Appeal {
  id: string;
  caseId: string;
  authorId: string;
  statement: string;
  evidence?: string[];
  status: 'pending' | 'upheld' | 'denied';
  createdAt: string;
  updatedAt: string;
}

export interface FileAppealRequest {
  caseId: string;
  statement: string;
  evidence?: string[];
}

export interface AppealResponse {
  appeal: Appeal;
}

export interface AppealVote {
  id: string;
  appealId: string;
  userId: string;
  vote: 'uphold' | 'deny';
  weight: number;
  createdAt: string;
}

export interface AppealDetailsResponse {
  appeal: Appeal;
  votes: AppealVote[];
  totalUpholdWeight: number;
  totalDenyWeight: number;
}

export interface VoteOnAppealRequest {
  vote: 'uphold' | 'deny';
}

export interface VoteOnAppealResponse {
  vote: AppealVote;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

// ============================================================================
// Feed Query Parameters
// ============================================================================

export interface FeedQueryParams extends CursorPaginationParams {
  includeTopics?: string[];
  excludeTopics?: string[];
  region?: string;
  includeHighReputation?: boolean;
  includeReplies?: boolean;
}
