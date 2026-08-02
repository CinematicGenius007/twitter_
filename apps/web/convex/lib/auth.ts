import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Resolves the Convex app-level `users` row for the signed-in Clerk
 * identity, or null if either not signed in or not yet onboarded (no
 * handle claimed via users.completeProfile). Never auto-creates a row —
 * handle must be user-chosen, not derived from Clerk defaults.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Same as getCurrentUser but throws if unauthenticated or not onboarded. */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated or not onboarded");
  return user;
}
