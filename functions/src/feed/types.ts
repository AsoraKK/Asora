export interface FeedCursor {
  ts: number;
  id: string;
}

export interface FeedMeta {
  count: number;
  nextCursor: string | null;
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
}

export interface PostStats {
  likes: number;
  comments: number;
  replies: number;
}

export interface PostRecord {
  postId: string;
  text: string;
  mediaUrl: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  stats: PostStats;
}

export interface CreatePostResult {
  body: {
    status: 'success';
    post: PostRecord;
  };
  headers: Record<string, string>;
}
