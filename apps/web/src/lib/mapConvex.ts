import type { Profile, Tweet } from "./types";

// Maps a Convex tweet DTO (see convex/lib/serialize.ts serializeTweet, and
// the retweetedByHandle addition in convex/feed.ts followingFeed) to the
// old snake_case Tweet shape components already expect.
export function mapTweet(t: any): Tweet {
  return {
    id: t._id,
    author_id: t.authorId,
    body: t.body ?? null,
    parent_tweet_id: t.parentTweetId ?? null,
    quoted_tweet_id: t.quotedTweetId ?? null,
    created_at: t.createdAt,
    edited_at: t.editedAt ?? null,
    likes_count: t.likesCount,
    retweets_count: t.retweetsCount,
    replies_count: t.repliesCount,
    author: {
      id: t.author._id,
      handle: t.author.handle,
      display_name: t.author.displayName,
      avatar_url: t.author.avatarUrl ?? null,
    },
    media: t.media.map((m: any) => ({ id: m._id, url: m.url, kind: m.kind, position: m.position })),
    hashtags: t.hashtags,
    quoted_tweet: t.quotedTweet ? mapTweet(t.quotedTweet) : null,
    viewer_liked: t.viewerLiked,
    viewer_retweeted: t.viewerRetweeted,
    viewer_bookmarked: t.viewerBookmarked,
    ...(t.retweetedByHandle !== undefined ? { retweeted_by_handle: t.retweetedByHandle } : {}),
  };
}

export function mapProfile(p: any): Profile {
  return {
    id: p._id,
    handle: p.handle,
    display_name: p.displayName,
    bio: p.bio ?? null,
    location: p.location ?? null,
    website: p.website ?? null,
    avatar_url: p.avatarUrl ?? null,
    header_url: p.headerUrl ?? null,
    pinned_tweet_id: p.pinnedTweetId ?? null,
    created_at: p.createdAt,
    tweets_count: p.tweetsCount,
    followers_count: p.followersCount,
    following_count: p.followingCount,
    viewer_following: p.viewerFollowing,
    pinned_tweet: p.pinnedTweet ? mapTweet(p.pinnedTweet) : null,
  };
}
