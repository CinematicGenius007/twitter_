import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Convex has no triggers — every insert/delete of a likes/retweets row, or
// insert/delete of a reply tweet, must explicitly patch the parent tweet's
// denormalized counter inside the same mutation. Safe because Convex
// mutations are fully transactional/serializable, no lost-update race.

async function bump(ctx: MutationCtx, tweetId: Id<"tweets">, field: "likesCount" | "retweetsCount" | "repliesCount", delta: 1 | -1) {
  const tweet = await ctx.db.get(tweetId);
  if (!tweet) return;
  const next = Math.max(0, tweet[field] + delta);
  await ctx.db.patch(tweetId, { [field]: next });
}

export const incrementLikeCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "likesCount", 1);
export const decrementLikeCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "likesCount", -1);
export const incrementRetweetCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "retweetsCount", 1);
export const decrementRetweetCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "retweetsCount", -1);
export const incrementReplyCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "repliesCount", 1);
export const decrementReplyCount = (ctx: MutationCtx, tweetId: Id<"tweets">) => bump(ctx, tweetId, "repliesCount", -1);
