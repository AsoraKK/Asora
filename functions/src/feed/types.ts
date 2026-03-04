export interface FeedCursor {
  ts: number;
  id: string;
}

export interface FeedMeta {
  count: number;
  nextCursor: string | null;
  sinceCursor?: string | null;  // For forward pagination (fetch newer items)
  timingsMs?: Record<string, number>;
  applied?: Record<string, unknown>;
}

export interface FeedResultBody {
  items: Record<string, unknown>[];
  meta: FeedMeta;
}

export interface FeedResult {
  body: FeedResultBody;
  headers: Record<string, string>;
}

export interface CreatePostBody {
  text?: string;
  mediaUrl?: string | null;
  authorId?: string | null;
  aiLabel?: 'human' | 'generated';
}

export interface PostStats {
  likes: number;
  comments: number;
  replies: number;
}

/**
 * Moderation status for content
 */
export type ModerationStatus = 'clean' | 'warned' | 'blocked';

/**
 * Moderation metadata stored with content
 */
export interface ModerationMeta {
  /** Current moderation status */
  status: ModerationStatus;
  /** Timestamp of moderation check */
  checkedAt: number;
  /** Confidence score from AI moderation (0-1) */
  confidence?: number;
  /** Categories flagged by moderation */
  categories?: string[];
  /** Human-readable reasons */
  reasons?: string[];
  /** Error message if moderation failed */
  error?: string;
}

export interface PostRecord {
  postId: string;
  text: string;
  mediaUrl: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  stats: PostStats;
  /** Moderation metadata (optional for backwards compatibility) */
  moderation?: ModerationMeta;
}

export interface CreatePostResult {
  body: {
    status: 'success';
    post: PostRecord;
  };
  headers: Record<string, string>;
}
