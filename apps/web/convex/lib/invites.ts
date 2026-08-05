import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/** Invitations each member may have outstanding-or-accepted at once.
 *  Overridable per user via `users.inviteAllowance`. */
export const INVITE_ALLOWANCE = 5;

/** Matches the one-month life of the Clerk invitation behind it, so our row
 *  and Clerk's never disagree about whether a link still works. */
export const INVITE_TTL_DAYS = 30;

// Deliberately loose: enough to catch a typo'd address before we spend a
// Clerk send on it, not an attempt at RFC 5322. Clerk rejects the rest.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertValidEmail(email: string): void {
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new Error("That doesn't look like an email address.");
  }
}

/** `ada@example.com` → `a••@example.com`. Shown on the public invitation
 *  landing page so the recipient can tell which of their addresses was
 *  invited, without the page handing a live address to anyone with the link. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}•${domain}`;
  return `${local[0]}${"•".repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}${domain}`;
}

export function isExpired(invite: Doc<"invites">, now = Date.now()): boolean {
  return Date.parse(invite.expiresAt) <= now;
}

/** Pending, unexpired, and therefore still able to admit someone. */
export function isUsable(invite: Doc<"invites">, now = Date.now()): boolean {
  return invite.status === "pending" && !isExpired(invite, now);
}

export function expiryFromNow(now = Date.now()): string {
  return new Date(now + INVITE_TTL_DAYS * 86_400_000).toISOString();
}

/** The single usable invitation for an address, if there is one. Multiple
 *  rows can exist per email over time (revoked, expired, re-sent); only a
 *  pending unexpired one admits anybody. */
export async function findUsableInviteForEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<Doc<"invites"> | null> {
  const rows = await ctx.db
    .query("invites")
    .withIndex("by_email_status", (q) => q.eq("email", normalizeEmail(email)).eq("status", "pending"))
    .collect();
  const now = Date.now();
  return rows.find((r) => isUsable(r, now)) ?? null;
}

/**
 * The verified email address on the caller's Clerk identity, or null.
 *
 * This is the whole basis of the invite gate: the invitation names an email,
 * and only the person Clerk has verified as owning that address can spend it.
 * A leaked invite link is inert without it.
 *
 * Requires `email` in the Clerk JWT template named "convex" (Clerk's Convex
 * integration includes it by default; if a deployment's template was hand-
 * edited, add `"email": "{{user.primary_email_address}}"` back).
 */
export async function getIdentityEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return null;
  // `emailVerified` is absent from some JWT templates — only treat an explicit
  // `false` as disqualifying, since Clerk verifies the address as part of
  // accepting the invitation anyway.
  if (identity.emailVerified === false) return null;
  return normalizeEmail(identity.email);
}

export function allowanceFor(user: Doc<"users">): number {
  return user.inviteAllowance ?? INVITE_ALLOWANCE;
}

/** Spent = outstanding + accepted. Revoked and expired invitations are
 *  refunded, so a member isn't permanently punished for a typo'd address. */
export async function countSpentInvites(
  ctx: QueryCtx | MutationCtx,
  inviterId: Doc<"users">["_id"],
): Promise<number> {
  const rows = await ctx.db
    .query("invites")
    .withIndex("by_inviter", (q) => q.eq("inviterId", inviterId))
    .collect();
  const now = Date.now();
  return rows.filter((r) => r.status === "accepted" || isUsable(r, now)).length;
}
