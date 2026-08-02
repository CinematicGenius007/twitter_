export interface TweetAuthor {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TweetMedia {
  id: string;
  url: string | null;
  kind: string;
  position: number;
}

export interface Tweet {
  id: string;
  author_id: string;
  body: string | null;
  parent_tweet_id: string | null;
  quoted_tweet_id: string | null;
  created_at: string;
  edited_at: string | null;
  likes_count: number;
  retweets_count: number;
  replies_count: number;
  author: TweetAuthor;
  media: TweetMedia[];
  hashtags: string[];
  quoted_tweet: Tweet | null;
  viewer_liked: boolean;
  viewer_retweeted: boolean;
  viewer_bookmarked: boolean;
  // Set only on entries surfaced via the following feed's retweet
  // interleaving (convex/feed.ts followingFeed) — null/undefined elsewhere.
  retweeted_by_handle?: string | null;
}

export interface User {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  header_url: string | null;
  pinned_tweet_id: string | null;
  created_at: string;
}

export interface Profile extends User {
  tweets_count: number;
  followers_count: number;
  following_count: number;
  viewer_following: boolean;
  pinned_tweet: Tweet | null;
}

// Maps a Convex `users` doc (camelCase) to the old snake_case DTO shape the
// existing components already expect, to minimize component-level diff.
export function mapUser(doc: {
  _id: string;
  handle: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  headerUrl?: string;
  pinnedTweetId?: string;
  createdAt: string;
}): User {
  return {
    id: doc._id,
    handle: doc.handle,
    display_name: doc.displayName,
    bio: doc.bio ?? null,
    location: doc.location ?? null,
    website: doc.website ?? null,
    avatar_url: doc.avatarUrl ?? null,
    header_url: doc.headerUrl ?? null,
    pinned_tweet_id: doc.pinnedTweetId ?? null,
    created_at: doc.createdAt,
  };
}
