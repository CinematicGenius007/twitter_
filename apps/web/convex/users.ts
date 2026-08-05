import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { findUsableInviteForEmail, getIdentityEmail } from "./lib/invites";
import { rateLimiter } from "./lib/rateLimits";
import { serializeTweet } from "./lib/serialize";
import type { Doc } from "./_generated/dataModel";

const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function findByHandle(ctx: QueryCtx | MutationCtx, handle: string): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_handle", (q) => q.eq("handle", handle.toLowerCase()))
    .unique();
}

/** Returns the app-level profile row for the signed-in Clerk identity, or
 *  null if unauthenticated or not yet onboarded (no handle claimed). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/** One-time onboarding step after Clerk sign-up: claim a Penny Post handle.
 *  Clerk doesn't know about app-specific profile fields, so this can't be
 *  a silent lazy-create — the user picks a handle explicitly.
 *
 *  This is also the app-side half of the invite-only gate (see
 *  `convex/invites.ts`): no `users` row is ever created without a pending
 *  invitation for the caller's own Clerk-verified email. Clerk's restricted
 *  sign-up mode is the first line; this one holds even if that setting is
 *  wrong, because it's the only code path that can mint a profile. */
export const completeProfile = mutation({
  args: {
    handle: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, { handle, displayName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingForIdentity = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existingForIdentity) throw new Error("Profile already completed");

    // Invite gate runs before the rate limiter so someone turned away at the
    // door gets the real reason rather than "too many attempts". The founder
    // exception is the empty-deployment case only: the first account has
    // nobody to be invited by, and once it exists the branch is unreachable.
    const founder = (await ctx.db.query("users").first()) === null;
    let invite = null;
    if (!founder) {
      const email = await getIdentityEmail(ctx);
      if (!email) {
        throw new Error("Penny Post needs a verified email address on your account before you can enrol.");
      }
      invite = await findUsableInviteForEmail(ctx, email);
      if (!invite) {
        throw new Error("Penny Post is by invitation only, and this address has none outstanding.");
      }
    }

    await rateLimiter.limit(ctx, "completeProfile", { key: identity.subject, throws: true });

    const normalizedHandle = handle.toLowerCase();
    if (!HANDLE_RE.test(normalizedHandle)) {
      throw new Error("Handle must be 1-15 characters: letters, numbers, underscore");
    }
    if (displayName.length < 1 || displayName.length > 50) {
      throw new Error("Display name must be 1-50 characters");
    }

    const handleTaken = await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", normalizedHandle))
      .unique();
    if (handleTaken) throw new Error("Handle already taken");

    const now = new Date().toISOString();
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      handle: normalizedHandle,
      displayName,
      createdAt: now,
      invitedBy: invite?.inviterId,
    });

    // Spending the invitation and creating the profile are the same
    // transaction, so an invitation can never admit two accounts.
    if (invite) {
      await ctx.db.patch(invite._id, { status: "accepted", acceptedAt: now, acceptedUserId: userId });
    }

    return await ctx.db.get(userId);
  },
});

export const search = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const all = await ctx.db.query("users").collect();
    const matches = all.filter(
      (u) => u.handle.includes(needle) || u.displayName.toLowerCase().includes(needle),
    );
    matches.sort((a, b) => a.handle.localeCompare(b.handle));
    return matches.slice(0, 20);
  },
});

export const getProfile = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const viewer = await getCurrentUser(ctx);
    const user = await findByHandle(ctx, handle);
    if (!user) throw new Error("User not found");

    const [tweetsRows, followersRows, followingRows, viewerFollowingRow] = await Promise.all([
      ctx.db
        .query("tweets")
        .withIndex("by_author", (q) => q.eq("authorId", user._id))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_followee", (q) => q.eq("followeeId", user._id))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", user._id))
        .collect(),
      viewer
        ? ctx.db
            .query("follows")
            .withIndex("by_follower_followee", (q) => q.eq("followerId", viewer._id).eq("followeeId", user._id))
            .unique()
        : null,
    ]);

    let pinnedTweet = null;
    if (user.pinnedTweetId) {
      const p = await ctx.db.get(user.pinnedTweetId);
      if (p) pinnedTweet = await serializeTweet(ctx, p, viewer?._id ?? null);
    }

    return {
      ...user,
      tweetsCount: tweetsRows.length,
      followersCount: followersRows.length,
      followingCount: followingRows.length,
      viewerFollowing: !!viewerFollowingRow,
      pinnedTweet,
    };
  },
});

export const getTweets = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const viewer = await getCurrentUser(ctx);
    const user = await findByHandle(ctx, handle);
    if (!user) throw new Error("User not found");
    const rows = await ctx.db
      .query("tweets")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 50);
    return await Promise.all(capped.map((t) => serializeTweet(ctx, t, viewer?._id ?? null)));
  },
});

// Public — classic Twitter behavior, anyone can see what a user liked.
// (Bookmarks stay owner-only in bookmarks.ts — never this pattern.)
export const getLikes = query({
  args: { handle: v.string() },
  handler: async (ctx, { handle }) => {
    const viewer = await getCurrentUser(ctx);
    const user = await findByHandle(ctx, handle);
    if (!user) throw new Error("User not found");
    const rows = await ctx.db
      .query("likes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const capped = rows.slice(0, 50);
    const tweets = (await Promise.all(capped.map((r) => ctx.db.get(r.tweetId)))).filter(
      (t): t is Doc<"tweets"> => t != null,
    );
    return await Promise.all(tweets.map((t) => serializeTweet(ctx, t, viewer?._id ?? null)));
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    headerStorageId: v.optional(v.id("_storage")),
    pinnedTweetId: v.optional(v.union(v.id("tweets"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const patch: Partial<Doc<"users">> = {};
    let hasUpdate = false;

    if (args.displayName !== undefined) {
      const trimmed = args.displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 50) throw new Error("Display name must be 1-50 characters");
      patch.displayName = trimmed;
      hasUpdate = true;
    }
    if (args.bio !== undefined) {
      patch.bio = args.bio.trim() || undefined;
      hasUpdate = true;
    }
    if (args.location !== undefined) {
      patch.location = args.location.trim() || undefined;
      hasUpdate = true;
    }
    if (args.website !== undefined) {
      patch.website = args.website.trim() || undefined;
      hasUpdate = true;
    }
    if (args.avatarStorageId !== undefined) {
      const meta = await ctx.storage.getMetadata(args.avatarStorageId);
      if (!meta || !ALLOWED_IMAGE_TYPES.includes(meta.contentType ?? "") || meta.size > MAX_IMAGE_BYTES) {
        throw new Error("Invalid avatar image");
      }
      patch.avatarUrl = (await ctx.storage.getUrl(args.avatarStorageId)) ?? undefined;
      hasUpdate = true;
    }
    if (args.headerStorageId !== undefined) {
      const meta = await ctx.storage.getMetadata(args.headerStorageId);
      if (!meta || !ALLOWED_IMAGE_TYPES.includes(meta.contentType ?? "") || meta.size > MAX_IMAGE_BYTES) {
        throw new Error("Invalid header image");
      }
      patch.headerUrl = (await ctx.storage.getUrl(args.headerStorageId)) ?? undefined;
      hasUpdate = true;
    }
    if (args.pinnedTweetId !== undefined) {
      if (args.pinnedTweetId === null) {
        patch.pinnedTweetId = undefined;
      } else {
        const t = await ctx.db.get(args.pinnedTweetId);
        if (!t || t.authorId !== user._id) throw new Error("Pinned tweet must be your own");
        patch.pinnedTweetId = args.pinnedTweetId;
      }
      hasUpdate = true;
    }

    if (!hasUpdate) throw new Error("Nothing to update");
    await ctx.db.patch(user._id, patch);
    return await ctx.db.get(user._id);
  },
});
