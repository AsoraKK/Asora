/**
 * ASORA NOTIFICATIONS SUBSYSTEM - TYPES
 * 
 * Core types for notifications infrastructure:
 * - Events (transient processing queue)
 * - Notifications (in-app persistent list)
 * - User preferences (category toggles, quiet hours)
 * - Device tokens (push targets)
 */

// ============================================================================
// NOTIFICATION CATEGORIES & EVENT TYPES
// ============================================================================

export type NotificationCategory = 
  | 'SOCIAL'
  | 'SAFETY'
  | 'SECURITY'
  | 'NEWS'
  | 'MARKETING';

export enum NotificationEventType {
  // Social
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_REPLY = 'COMMENT_REPLY',
  POST_LIKED = 'POST_LIKED',
  POST_REACTED = 'POST_REACTED',
  USER_FOLLOWED = 'USER_FOLLOWED',
  FOLLOWER_POSTED = 'FOLLOWER_POSTED',
  
  // Safety & Security
  MODERATION_CONTENT_BLOCKED = 'MODERATION_CONTENT_BLOCKED',
  MODERATION_APPEAL_DECIDED = 'MODERATION_APPEAL_DECIDED',
  SECURITY_LOGIN_NEW_DEVICE = 'SECURITY_LOGIN_NEW_DEVICE',
  ACCOUNT_CHANGE = 'ACCOUNT_CHANGE',
  
  // News & Marketing
  NEWS_ALERT = 'NEWS_ALERT',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
}

// Map event types to categories
export const EVENT_TYPE_CATEGORY: Record<NotificationEventType, NotificationCategory> = {
  [NotificationEventType.COMMENT_CREATED]: 'SOCIAL',
  [NotificationEventType.COMMENT_REPLY]: 'SOCIAL',
  [NotificationEventType.POST_LIKED]: 'SOCIAL',
  [NotificationEventType.POST_REACTED]: 'SOCIAL',
  [NotificationEventType.USER_FOLLOWED]: 'SOCIAL',
  [NotificationEventType.FOLLOWER_POSTED]: 'SOCIAL',
  
  [NotificationEventType.MODERATION_CONTENT_BLOCKED]: 'SAFETY',
  [NotificationEventType.MODERATION_APPEAL_DECIDED]: 'SAFETY',
  
  [NotificationEventType.SECURITY_LOGIN_NEW_DEVICE]: 'SECURITY',
  [NotificationEventType.ACCOUNT_CHANGE]: 'SECURITY',
  
  [NotificationEventType.NEWS_ALERT]: 'NEWS',
  [NotificationEventType.MARKETING_CAMPAIGN]: 'MARKETING',
};

// ============================================================================
// NOTIFICATION EVENT (processing queue)
// ============================================================================

export type NotificationEventStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DEAD_LETTER';

export interface NotificationEvent {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  category: NotificationCategory;
  
  // Payload for building notification
  payload: {
    actorId?: string;          // Who triggered this (e.g., commenter, liker)
    actorName?: string;
    targetId?: string;          // e.g., postId, commentId
    targetType?: string;        // 'post', 'comment', 'user'
    snippet?: string;           // Safe snippet (no DM content)
    count?: number;             // For aggregated events
    [key: string]: unknown;
  };
  
  // Processing metadata
  status: NotificationEventStatus;
  attemptCount: number;
  lastError?: string;
  dedupeKey?: string;           // For aggregation/dedupe
  
  // Timestamps
  createdAt: string;            // ISO8601
  scheduledAt?: string;         // For delayed sends
  processedAt?: string;
}

export interface NotificationEventInput {
  userId: string;
  eventType: NotificationEventType;
  payload: NotificationEvent['payload'];
  dedupeKey?: string;
  scheduledAt?: string;
}

// ============================================================================
// NOTIFICATION (in-app persistent)
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  category: NotificationCategory;
  eventType: NotificationEventType;
  
  // Display content
  title: string;
  body: string;
  iconUrl?: string;
  imageUrl?: string;
  
  // Navigation
  deeplink?: string;
  targetId?: string;
  targetType?: string;
  
  // State
  read: boolean;
  dismissed: boolean;
  
  // Timestamps
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
  expiresAt?: string;           // Auto-expire after 30 days
}

export interface NotificationInput {
  userId: string;
  category: NotificationCategory;
  eventType: NotificationEventType;
  title: string;
  body: string;
  deeplink?: string;
  targetId?: string;
  targetType?: string;
  iconUrl?: string;
  imageUrl?: string;
}

// ============================================================================
// USER NOTIFICATION PREFERENCES
// ============================================================================

export interface QuietHours {
  // Array of 24 booleans: true = quiet, false = allowed
  // Index 0 = 00:00-01:00, Index 23 = 23:00-24:00
  hours: boolean[];
}

export interface CategoryPreferences {
  social: boolean;
  news: boolean;
  marketing: boolean;
  // Safety/security are always-on (informational only)
}

export interface UserNotificationPreferences {
  id: string;                   // userId
  userId: string;
  
  timezone: string;             // IANA timezone (e.g., 'America/New_York')
  quietHours: QuietHours;
  categories: CategoryPreferences;
  
  // Metadata
  updatedAt: string;
  createdAt: string;
}

export interface UserNotificationPreferencesInput {
  timezone?: string;
  quietHours?: QuietHours;
  categories?: Partial<CategoryPreferences>;
}

// Default preferences
export const DEFAULT_QUIET_HOURS: QuietHours = {
  // 22:00 (10pm) to 07:00 (7am) = quiet
  hours: [
    true, true, true, true, true, true, true,  // 00-06 (quiet)
    false, false, false, false, false,         // 07-11 (allowed)
    false, false, false, false, false,         // 12-16 (allowed)
    false, false, false, false,                // 17-20 (allowed)
    false,                                     // 21 (allowed)
    true, true,                                // 22-23 (quiet)
  ],
};

export const DEFAULT_CATEGORY_PREFERENCES: CategoryPreferences = {
  social: true,
  news: false,
  marketing: false,
};

// ============================================================================
// USER DEVICE TOKEN (push targets)
// ============================================================================

export type Platform = 'android' | 'ios' | 'web';

export interface UserDeviceToken {
  id: string;                   // deviceId
  userId: string;
  deviceId: string;
  
  pushToken: string;            // FCM/APNS token
  platform: Platform;
  
  label?: string;               // User-provided label
  
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}

export interface UserDeviceTokenInput {
  deviceId: string;
  pushToken: string;
  platform: Platform;
  label?: string;
}

// ============================================================================
// PUSH PAYLOAD
// ============================================================================

export interface PushPayload {
  title: string;
  body: string;
  deeplink?: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

// ============================================================================
// RATE LIMIT TRACKING
// ============================================================================

export interface RateLimitCounter {
  userId: string;
  category: NotificationCategory;
  windowStart: string;
  windowEnd: string;
  count: number;
}
