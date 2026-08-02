import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { serializeTweet } from "./lib/serialize";
import type { Doc } from "./_generated/dataModel";

export const getByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, { tag }) => {
    const normalized = tag.toLowerCase();
    const viewer = await getCurrentUser(ctx);

    const hashtag = await ctx.db
      .query("hashtags")
      .withIndex("by_tag", (q) => q.eq("tag", normalized))
      .unique();
    if (!hashtag) return { tag: normalized, tweets: [] };

    const links = await ctx.db
      .query("tweetHashtags")
      .withIndex("by_hashtag", (q) => q.eq("hashtagId", hashtag._id))
      .collect();
    const rows = (await Promise.all(links.map((l) => ctx.db.get(l.tweetId)))).filter(
      (t): t is Doc<"tweets"> => t != null,
    );
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 50);

    const tweets = await Promise.all(capped.map((t) => serializeTweet(ctx, t, viewer?._id ?? null)));
    return { tag: normalized, tweets };
  },
});
