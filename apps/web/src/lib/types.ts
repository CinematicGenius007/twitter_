export interface TweetAuthor {
  id: number;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TweetMedia {
  id: number;
  url: string;
  kind: string;
  position: number;
}

export interface Tweet {
  id: number;
  author_id: number;
  body: string | null;
  parent_tweet_id: number | null;
  quoted_tweet_id: number | null;
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
}

export interface User {
  id: number;
  handle: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  header_url: string | null;
  pinned_tweet_id: number | null;
  created_at: string;
}

export interface Profile extends User {
  tweets_count: number;
  followers_count: number;
  following_count: number;
  viewer_following: boolean;
  pinned_tweet: Tweet | null;
}
