import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import { serializeTweet } from "./lib/serialize";
import type { Doc } from "./_generated/dataModel";

// Bookmarks are always private. Every function here derives userId from
// ctx.auth only — never accepts a userId/handle argument — so there is no
// code path where a client could read someone else's bookmarks.

export const myBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 50);
    const tweets = (await Promise.all(capped.map((r) => ctx.db.get(r.tweetId)))).filter(
      (t): t is Doc<"tweets"> => t != null,
    );
    return await Promise.all(tweets.map((t) => serializeTweet(ctx, t, user._id)));
  },
});

export const toggle = mutation({
  args: { tweetId: v.id("tweets"), bookmarked: v.boolean() },
  handler: async (ctx, { tweetId, bookmarked }) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "toggleAction", { key: user._id, throws: true });

    const tweet = await ctx.db.get(tweetId);
    if (!tweet) throw new Error("Tweet not found");

    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_tweet_user", (q) => q.eq("tweetId", tweetId).eq("userId", user._id))
      .unique();

    if (bookmarked) {
      if (!existing) {
        await ctx.db.insert("bookmarks", { tweetId, userId: user._id, createdAt: new Date().toISOString() });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true };
  },
});
