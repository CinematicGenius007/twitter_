import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export interface TweetAuthorDTO {
  _id: Id<"users">;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface TweetMediaDTO {
  _id: Id<"tweetMedia">;
  url: string | null;
  kind: "image" | "gif" | "video";
  position: number;
}

export interface TweetDTO extends Doc<"tweets"> {
  author: TweetAuthorDTO;
  media: TweetMediaDTO[];
  hashtags: string[];
  quotedTweet: TweetDTO | null;
  viewerLiked: boolean;
  viewerRetweeted: boolean;
  viewerBookmarked: boolean;
}

/** depth caps quote-tweet embedding at one level — a quote of a quote shows
 *  the immediate quoted tweet only, its own quotedTweet is not expanded. */
export async function serializeTweet(
  ctx: QueryCtx,
  tweet: Doc<"tweets">,
  viewerId: Id<"users"> | null,
  depth = 0,
): Promise<TweetDTO> {
  const authorDoc = await ctx.db.get(tweet.authorId);
  if (!authorDoc) throw new Error("Tweet author missing");
  const author: TweetAuthorDTO = {
    _id: authorDoc._id,
    handle: authorDoc.handle,
    displayName: authorDoc.displayName,
    avatarUrl: authorDoc.avatarUrl ?? null,
  };

  const mediaRows = await ctx.db
    .query("tweetMedia")
    .withIndex("by_tweet", (q) => q.eq("tweetId", tweet._id))
    .collect();
  mediaRows.sort((a, b) => a.position - b.position);
  const media: TweetMediaDTO[] = await Promise.all(
    mediaRows.map(async (m) => ({
      _id: m._id,
      url: await ctx.storage.getUrl(m.storageId),
      kind: m.kind,
      position: m.position,
    })),
  );

  const tweetHashtagRows = await ctx.db
    .query("tweetHashtags")
    .withIndex("by_tweet", (q) => q.eq("tweetId", tweet._id))
    .collect();
  const hashtagDocs = await Promise.all(tweetHashtagRows.map((r) => ctx.db.get(r.hashtagId)));
  const hashtags = hashtagDocs.filter((h): h is Doc<"hashtags"> => h != null).map((h) => h.tag);

  let quotedTweet: TweetDTO | null = null;
  if (tweet.quotedTweetId && depth === 0) {
    const quotedRow = await ctx.db.get(tweet.quotedTweetId);
    if (quotedRow) quotedTweet = await serializeTweet(ctx, quotedRow, viewerId, depth + 1);
  }

  let viewerLiked = false;
  let viewerRetweeted = false;
  let viewerBookmarked = false;
  if (viewerId) {
    const [liked, retweeted, bookmarked] = await Promise.all([
      ctx.db
        .query("likes")
        .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweet._id).eq("userId", viewerId))
        .unique(),
      ctx.db
        .query("retweets")
        .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweet._id).eq("userId", viewerId))
        .unique(),
      ctx.db
        .query("bookmarks")
        .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweet._id).eq("userId", viewerId))
        .unique(),
    ]);
    viewerLiked = !!liked;
    viewerRetweeted = !!retweeted;
    viewerBookmarked = !!bookmarked;
  }

  return { ...tweet, author, media, hashtags, quotedTweet, viewerLiked, viewerRetweeted, viewerBookmarked };
}

export interface UserProfileDTO extends Doc<"users"> {
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  viewerFollowing: boolean;
}
