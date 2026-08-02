import { db } from "../db/client";
import { extractHashtags, extractMentions } from "./parse";

export interface TweetRow {
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
}

export interface TweetAuthor {
  id: number;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

export interface TweetMediaItem {
  id: number;
  url: string;
  kind: string;
  position: number;
}

export interface TweetDTO extends TweetRow {
  author: TweetAuthor;
  media: TweetMediaItem[];
  hashtags: string[];
  quoted_tweet: TweetDTO | null;
  viewer_liked: boolean;
  viewer_retweeted: boolean;
  viewer_bookmarked: boolean;
}

const authorQuery = db.query("SELECT id, handle, display_name, avatar_url FROM users WHERE id = ?");
const mediaQuery = db.query("SELECT id, url, kind, position FROM tweet_media WHERE tweet_id = ? ORDER BY position");
const hashtagsQuery = db.query(
  "SELECT h.tag FROM hashtags h JOIN tweet_hashtags th ON th.hashtag_id = h.id WHERE th.tweet_id = ?",
);
const likedQuery = db.query("SELECT 1 FROM likes WHERE tweet_id = ? AND user_id = ?");
const retweetedQuery = db.query("SELECT 1 FROM retweets WHERE tweet_id = ? AND user_id = ?");
const bookmarkedQuery = db.query("SELECT 1 FROM bookmarks WHERE tweet_id = ? AND user_id = ?");
const tweetByIdQuery = db.query("SELECT * FROM tweets WHERE id = ?");

export function getTweetById(id: number): TweetRow | undefined {
  return tweetByIdQuery.get(id) as TweetRow | undefined;
}

/** depth caps quote-tweet embedding at one level — a quote of a quote shows
 *  the immediate quoted tweet only, its own quoted_tweet is not expanded. */
export function toDTO(row: TweetRow, viewerId: number | null, depth = 0): TweetDTO {
  const author = authorQuery.get(row.author_id) as TweetAuthor;
  const media = mediaQuery.all(row.id) as TweetMediaItem[];
  const hashtags = (hashtagsQuery.all(row.id) as { tag: string }[]).map((r) => r.tag);

  let quoted_tweet: TweetDTO | null = null;
  if (row.quoted_tweet_id && depth === 0) {
    const quotedRow = tweetByIdQuery.get(row.quoted_tweet_id) as TweetRow | undefined;
    if (quotedRow) quoted_tweet = toDTO(quotedRow, viewerId, depth + 1);
  }

  return {
    ...row,
    author,
    media,
    hashtags,
    quoted_tweet,
    viewer_liked: viewerId ? !!likedQuery.get(row.id, viewerId) : false,
    viewer_retweeted: viewerId ? !!retweetedQuery.get(row.id, viewerId) : false,
    viewer_bookmarked: viewerId ? !!bookmarkedQuery.get(row.id, viewerId) : false,
  };
}

const findUserByHandle = db.query("SELECT id FROM users WHERE handle = ?");
const insertMention = db.query("INSERT INTO mentions (tweet_id, mentioned_user_id) VALUES (?, ?)");
const deleteMentions = db.query("DELETE FROM mentions WHERE tweet_id = ?");
const findHashtag = db.query("SELECT id FROM hashtags WHERE tag = ?");
const insertHashtag = db.query("INSERT INTO hashtags (tag) VALUES (?) RETURNING id");
const insertTweetHashtag = db.query(
  "INSERT OR IGNORE INTO tweet_hashtags (tweet_id, hashtag_id) VALUES (?, ?)",
);
const deleteTweetHashtags = db.query("DELETE FROM tweet_hashtags WHERE tweet_id = ?");

function getOrCreateHashtagId(tag: string): number {
  const existing = findHashtag.get(tag) as { id: number } | null;
  if (existing) return existing.id;
  return (insertHashtag.get(tag) as { id: number }).id;
}

/** Re-derives mentions/hashtags from a tweet's current body. Call on create
 *  and on every edit — cheap at this scale, avoids diffing old vs new body. */
export function syncMentionsAndHashtags(tweetId: number, body: string): void {
  deleteMentions.run(tweetId);
  deleteTweetHashtags.run(tweetId);

  for (const handle of extractMentions(body)) {
    const user = findUserByHandle.get(handle) as { id: number } | null;
    if (user) insertMention.run(tweetId, user.id);
  }

  for (const tag of extractHashtags(body)) {
    insertTweetHashtag.run(tweetId, getOrCreateHashtagId(tag));
  }
}
