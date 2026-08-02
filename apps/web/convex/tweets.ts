import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import { serializeTweet } from "./lib/serialize";
import { syncMentionsAndHashtags } from "./lib/tweetMeta";
import {
  incrementLikeCount,
  decrementLikeCount,
  incrementRetweetCount,
  decrementRetweetCount,
  incrementReplyCount,
  decrementReplyCount,
} from "./lib/counters";
import type { Doc } from "./_generated/dataModel";

const MAX_TWEET_LENGTH = 280;
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export const create = mutation({
  args: {
    body: v.optional(v.string()),
    parentTweetId: v.optional(v.id("tweets")),
    quotedTweetId: v.optional(v.id("tweets")),
    media: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          kind: v.union(v.literal("image"), v.literal("gif"), v.literal("video")),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "postTweet", { key: user._id, throws: true });

    const text = (args.body ?? "").trim();
    if (!args.quotedTweetId && text.length === 0) {
      throw new Error("body is required unless quoting a tweet");
    }
    if (text.length > MAX_TWEET_LENGTH) {
      throw new Error(`body must be ${MAX_TWEET_LENGTH} characters or fewer`);
    }

    let parent: Doc<"tweets"> | null = null;
    if (args.parentTweetId) {
      parent = await ctx.db.get(args.parentTweetId);
      if (!parent) throw new Error("parent tweet not found");
    }
    if (args.quotedTweetId && !(await ctx.db.get(args.quotedTweetId))) {
      throw new Error("quoted tweet not found");
    }

    const tweetId = await ctx.db.insert("tweets", {
      authorId: user._id,
      body: text || undefined,
      parentTweetId: args.parentTweetId,
      quotedTweetId: args.quotedTweetId,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
    });

    if (args.media) {
      for (let i = 0; i < args.media.length; i++) {
        const m = args.media[i]!;
        const meta = await ctx.storage.getMetadata(m.storageId);
        if (!meta || !ALLOWED_MEDIA_TYPES.includes(meta.contentType ?? "") || meta.size > MAX_MEDIA_BYTES) {
          throw new Error("Invalid media upload");
        }
        await ctx.db.insert("tweetMedia", { tweetId, storageId: m.storageId, kind: m.kind, position: i });
      }
    }

    if (text) await syncMentionsAndHashtags(ctx, tweetId, text);
    if (parent) await incrementReplyCount(ctx, parent._id);

    const tweet = (await ctx.db.get(tweetId))!;
    return await serializeTweet(ctx, tweet, user._id);
  },
});

export const getWithThread = query({
  args: { tweetId: v.id("tweets") },
  handler: async (ctx, { tweetId }) => {
    const viewer = await getCurrentUser(ctx);
    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");

    const parents: Doc<"tweets">[] = [];
    let cursor = tweet.parentTweetId;
    while (cursor) {
      const parent = await ctx.db.get(cursor);
      if (!parent) break;
      parents.unshift(parent);
      cursor = parent.parentTweetId;
    }

    const replyRows = await ctx.db
      .query("tweets")
      .withIndex("by_parent", (q) => q.eq("parentTweetId", tweetId))
      .collect();
    replyRows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

    return {
      tweet: await serializeTweet(ctx, tweet, viewer?._id ?? null),
      parents: await Promise.all(parents.map((p) => serializeTweet(ctx, p, viewer?._id ?? null))),
      replies: await Promise.all(replyRows.map((r) => serializeTweet(ctx, r, viewer?._id ?? null))),
    };
  },
});

export const update = mutation({
  args: { tweetId: v.id("tweets"), body: v.string() },
  handler: async (ctx, { tweetId, body }) => {
    const user = await requireCurrentUser(ctx);
    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");
    if (tweet.authorId !== user._id) throw new Error("Forbidden");

    const text = body.trim();
    if (text.length === 0 && !tweet.quotedTweetId) throw new Error("body is required");
    if (text.length > MAX_TWEET_LENGTH) throw new Error(`body must be ${MAX_TWEET_LENGTH} characters or fewer`);

    await ctx.db.patch(tweetId, { body: text || undefined, editedAt: new Date().toISOString() });
    await syncMentionsAndHashtags(ctx, tweetId, text);

    const updated = (await ctx.db.get(tweetId))!;
    return await serializeTweet(ctx, updated, user._id);
  },
});

export const remove = mutation({
  args: { tweetId: v.id("tweets") },
  handler: async (ctx, { tweetId }) => {
    const user = await requireCurrentUser(ctx);
    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");
    if (tweet.authorId !== user._id) throw new Error("Forbidden");

    // No ON DELETE CASCADE in Convex — clean up direct children manually.
    // Shallow only (doesn't recurse into replies-of-replies' own children);
    // acceptable at this depth, orphaned rows are never surfaced without a
    // live parent lookup.
    const replies = await ctx.db
      .query("tweets")
      .withIndex("by_parent", (q) => q.eq("parentTweetId", tweetId))
      .collect();
    for (const r of replies) await ctx.db.delete(r._id);

    const media = await ctx.db
      .query("tweetMedia")
      .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const m of media) await ctx.db.delete(m._id);

    const likes = await ctx.db
      .query("likes")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const l of likes) await ctx.db.delete(l._id);

    const retweets = await ctx.db
      .query("retweets")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const r of retweets) await ctx.db.delete(r._id);

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const b of bookmarks) await ctx.db.delete(b._id);

    const tweetHashtags = await ctx.db
      .query("tweetHashtags")
      .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const th of tweetHashtags) await ctx.db.delete(th._id);

    const mentions = await ctx.db
      .query("mentions")
      .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
      .collect();
    for (const m of mentions) await ctx.db.delete(m._id);

    if (tweet.parentTweetId) await decrementReplyCount(ctx, tweet.parentTweetId);

    await ctx.db.delete(tweetId);
    return { ok: true };
  },
});

export const toggleLike = mutation({
  args: { tweetId: v.id("tweets"), liked: v.boolean() },
  handler: async (ctx, { tweetId, liked }) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "toggleAction", { key: user._id, throws: true });

    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId).eq("userId", user._id))
      .unique();

    if (liked) {
      if (!existing) {
        await ctx.db.insert("likes", { tweetId, userId: user._id, createdAt: new Date().toISOString() });
        await incrementLikeCount(ctx, tweetId);
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
      await decrementLikeCount(ctx, tweetId);
    }
    return { ok: true };
  },
});

export const toggleRetweet = mutation({
  args: { tweetId: v.id("tweets"), retweeted: v.boolean() },
  handler: async (ctx, { tweetId, retweeted }) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "toggleAction", { key: user._id, throws: true });

    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");

    const existing = await ctx.db
      .query("retweets")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId).eq("userId", user._id))
      .unique();

    if (retweeted) {
      if (!existing) {
        await ctx.db.insert("retweets", { tweetId, userId: user._id, createdAt: new Date().toISOString() });
        await incrementRetweetCount(ctx, tweetId);
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
      await decrementRetweetCount(ctx, tweetId);
    }
    return { ok: true };
  },
});
