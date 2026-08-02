import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { extractHashtags, extractMentions } from "./parse";

async function getOrCreateHashtagId(ctx: MutationCtx, tag: string): Promise<Id<"hashtags">> {
  const existing = await ctx.db
    .query("hashtags")
    .withIndex("by_tag", (q) => q.eq("tag", tag))
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("hashtags", { tag });
}

/** Re-derives mentions/hashtags from a tweet's current body. Call on create
 *  and on every edit — cheap at this scale, avoids diffing old vs new body. */
export async function syncMentionsAndHashtags(ctx: MutationCtx, tweetId: Id<"tweets">, body: string): Promise<void> {
  const oldMentions = await ctx.db
    .query("mentions")
    .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
    .collect();
  for (const m of oldMentions) await ctx.db.delete(m._id);

  const oldTweetHashtags = await ctx.db
    .query("tweetHashtags")
    .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
    .collect();
  for (const th of oldTweetHashtags) await ctx.db.delete(th._id);

  for (const handle of extractMentions(body)) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
      .unique();
    if (user) await ctx.db.insert("mentions", { tweetId, mentionedUserId: user._id });
  }

  for (const tag of extractHashtags(body)) {
    const hashtagId = await getOrCreateHashtagId(ctx, tag);
    const existing = await ctx.db
      .query("tweetHashtags")
      .withIndex("by_tweet", (q) => q.eq("tweetId", tweetId))
      .filter((q) => q.eq(q.field("hashtagId"), hashtagId))
      .unique();
    if (!existing) await ctx.db.insert("tweetHashtags", { tweetId, hashtagId });
  }
}
