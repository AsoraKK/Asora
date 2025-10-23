export interface FeedPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface FeedResponse {
  ok: boolean;
  status: string;
  service: string;
  ts: string;
  data: {
    posts: unknown[];
    pagination: FeedPagination;
  };
}

export interface FeedResult {
  body: FeedResponse;
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
