import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import type { Doc } from "./_generated/dataModel";

async function findByHandle(ctx: QueryCtx | MutationCtx, handle: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
    .unique();
}

export const getFollowers = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const user = await findByHandle(ctx, handle);
    if (!user) throw new Error("User not found");
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_followee", (q) => q.eq("followeeId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 100);
    const users = (await Promise.all(capped.map((r) => ctx.db.get(r.followerId)))).filter(
      (u): u is Doc<"users"> => u != null,
    );
    return users;
  },
});

export const getFollowing = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const user = await findByHandle(ctx, handle);
    if (!user) throw new Error("User not found");
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 100);
    const users = (await Promise.all(capped.map((r) => ctx.db.get(r.followeeId)))).filter(
      (u): u is Doc<"users"> => u != null,
    );
    return users;
  },
});

export const toggle = mutation({
  args: { handle: v.string(), follow: v.boolean() },
  handler: async (ctx, { handle, follow }) => {
    const viewer = await requireCurrentUser(ctx);
    const target = await findByHandle(ctx, handle);
    if (!target) throw new Error("User not found");
    if (target._id === viewer._id) throw new Error("Cannot follow yourself");

    await rateLimiter.limit(ctx, "toggleAction", { key: viewer._id, throws: true });

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_followee", (q) => q.eq("followerId", viewer._id).eq("followeeId", target._id))
      .unique();

    if (follow) {
      if (!existing) {
        await ctx.db.insert("follows", {
          followerId: viewer._id,
          followeeId: target._id,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true };
  },
});
