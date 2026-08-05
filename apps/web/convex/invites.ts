import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";
import {
  allowanceFor,
  assertValidEmail,
  countSpentInvites,
  expiryFromNow,
  findUsableInviteForEmail,
  getIdentityEmail,
  INVITE_TTL_DAYS,
  isExpired,
  isUsable,
  maskEmail,
  normalizeEmail,
} from "./lib/invites";
import type { Doc, Id } from "./_generated/dataModel";

/*
  Invite-only sign-up.

  Two enforcement layers, deliberately:
    1. Clerk's restricted sign-up mode + Clerk invitations — stops an
       uninvited address at the front door, and gives us email delivery and
       address verification without this codebase touching credentials.
    2. `users.completeProfile` (see users.ts) refuses to create an app-level
       profile without a pending invitation matching the caller's verified
       email — so the rule holds even if the Clerk dashboard setting is
       flipped back to public by accident.

  The invitation is bound to an email, not to the link. Whoever holds the
  link, only the person Clerk verifies as owning that address gets in.
*/

const CLERK_API = "https://api.clerk.com/v1";

// `convex/_generated/api.d.ts` pulls this module into the frontend's tsc
// project, which is typed for the browser and has no Node globals. Convex's
// own runtime does provide `process.env`, so declare it module-locally rather
// than widening the app's `types` to include all of Node.
declare const process: { env: Record<string, string | undefined> };

type InviteStatusView = "pending" | "accepted" | "revoked" | "expired";

export interface InviteView {
  _id: Id<"invites">;
  email: string;
  code: string;
  status: InviteStatusView;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedHandle: string | null;
  ticketUrl: string | null;
}

function viewStatus(invite: Doc<"invites">): InviteStatusView {
  if (invite.status === "pending" && isExpired(invite)) return "expired";
  return invite.status;
}

/** URL-safe, unguessable landing-page key. Generated in the action (not a
 *  mutation) so it comes from real CSPRNG bytes rather than Convex's
 *  deterministically-seeded `Math.random`. */
function generateCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function clerkSecret(): string {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "CLERK_SECRET_KEY is not set on this Convex deployment — run `bunx convex env set CLERK_SECRET_KEY sk_...`",
    );
  }
  return key;
}

function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) {
    throw new Error("APP_URL is not set on this Convex deployment — run `bunx convex env set APP_URL https://...`");
  }
  return url.replace(/\/$/, "");
}

/** Turns Clerk's error envelope into something printable on paper. */
async function clerkError(res: Response, fallback: string): Promise<Error> {
  let detail = "";
  let code = "";
  try {
    const body = (await res.json()) as { errors?: Array<{ message?: string; long_message?: string; code?: string }> };
    const first = body.errors?.[0];
    code = first?.code ?? "";
    detail = first?.long_message || first?.message || "";
  } catch {
    // Clerk returned something that isn't JSON — fall through to the default.
  }
  if (code === "duplicate_record" || /already/i.test(detail)) {
    return new Error("That address already belongs to a subscriber, or has an invitation outstanding.");
  }
  return new Error(detail || `${fallback} (Clerk returned ${res.status})`);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** The caller's own invitations, plus how many they have left to give.
 *  Owner-derived like bookmarks — never takes a userId argument. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { invites: [] as InviteView[], allowance: 0, remaining: 0 };

    const rows = await ctx.db
      .query("invites")
      .withIndex("by_inviter", (q) => q.eq("inviterId", user._id))
      .collect();
    rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const invites: InviteView[] = await Promise.all(
      rows.map(async (r) => {
        const accepted = r.acceptedUserId ? await ctx.db.get(r.acceptedUserId) : null;
        return {
          _id: r._id,
          email: r.email,
          code: r.code,
          status: viewStatus(r),
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          acceptedAt: r.acceptedAt ?? null,
          acceptedHandle: accepted?.handle ?? null,
          // Only a live invitation carries a working accept link.
          ticketUrl: isUsable(r) ? (r.clerkTicketUrl ?? null) : null,
        };
      }),
    );

    const allowance = allowanceFor(user);
    const spent = await countSpentInvites(ctx, user._id);
    return { invites, allowance, remaining: Math.max(0, allowance - spent) };
  },
});

/** Public — backs the `/invitation/:code` landing page. Returns the masked
 *  address only: enough for the recipient to know which inbox was invited,
 *  not enough to harvest addresses by guessing codes. */
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!invite) return { status: "unknown" as const };

    const inviter = await ctx.db.get(invite.inviterId);
    return {
      status: viewStatus(invite),
      maskedEmail: maskEmail(invite.email),
      inviterHandle: inviter?.handle ?? null,
      inviterName: inviter?.displayName ?? null,
      expiresAt: invite.expiresAt,
      // The accept link is Clerk's ticket URL. Handing it out here is the same
      // trust model as Clerk's own emailed link: the code is unguessable, and
      // the ticket still only creates an account for the invited address.
      ticketUrl: isUsable(invite) ? (invite.clerkTicketUrl ?? null) : null,
    };
  },
});

/** Does the signed-in Clerk identity have an invitation waiting? Drives the
 *  gate on `/complete-profile` so a turned-away visitor sees an explanation
 *  instead of a form that will reject them. */
export const myEligibility = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { signedIn: false, eligible: false, reason: "signed-out" as const, email: null };

    const email = await getIdentityEmail(ctx);
    if (!email) {
      return { signedIn: true, eligible: false, reason: "no-verified-email" as const, email: null };
    }

    const founder = (await ctx.db.query("users").first()) === null;
    if (founder) return { signedIn: true, eligible: true, reason: "founder" as const, email };

    const invite = await findUsableInviteForEmail(ctx, email);
    return {
      signedIn: true,
      eligible: !!invite,
      reason: invite ? ("invited" as const) : ("no-invite" as const),
      email,
    };
  },
});

// ---------------------------------------------------------------------------
// Internal mutations — the transactional half of the send/revoke actions
// ---------------------------------------------------------------------------

/** Claims a slot and writes the row before Clerk is called, so two concurrent
 *  sends can't both slip past the allowance check. `discard` rolls it back if
 *  the Clerk call then fails. */
export const reserve = internalMutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, { email, code }) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "sendInvite", { key: user._id, throws: true });

    const normalized = normalizeEmail(email);
    assertValidEmail(normalized);

    const existing = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .collect();
    if (existing.some((r) => r.status === "accepted")) {
      throw new Error("That address already belongs to a subscriber.");
    }
    if (existing.some((r) => isUsable(r))) {
      throw new Error("That address already has an invitation outstanding.");
    }

    const allowance = allowanceFor(user);
    if ((await countSpentInvites(ctx, user._id)) >= allowance) {
      throw new Error(`Your allowance of ${allowance} invitations is spent.`);
    }

    const now = Date.now();
    const inviteId = await ctx.db.insert("invites", {
      email: normalized,
      code,
      inviterId: user._id,
      status: "pending",
      createdAt: new Date(now).toISOString(),
      expiresAt: expiryFromNow(now),
    });
    return { inviteId, email: normalized, inviterHandle: user.handle };
  },
});

export const attachClerk = internalMutation({
  args: {
    inviteId: v.id("invites"),
    clerkInvitationId: v.string(),
    clerkTicketUrl: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, { inviteId, clerkInvitationId, clerkTicketUrl, expiresAt }) => {
    await ctx.db.patch(inviteId, {
      clerkInvitationId,
      clerkTicketUrl,
      ...(expiresAt ? { expiresAt } : {}),
    });
  },
});

/** Rolls back a reserved row whose Clerk invitation never got created —
 *  otherwise a failed send would silently eat an allowance slot. */
export const discard = internalMutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (invite && invite.status === "pending") await ctx.db.delete(inviteId);
  },
});

/** Owner-checked. Returns the Clerk id so the action can revoke it there too. */
export const markRevoked = internalMutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const user = await requireCurrentUser(ctx);
    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.inviterId !== user._id) throw new Error("That invitation isn't yours to withdraw.");
    if (invite.status === "accepted") throw new Error("That invitation has already been taken up.");
    await ctx.db.patch(inviteId, { status: "revoked" });
    return { clerkInvitationId: invite.clerkInvitationId ?? null };
  },
});

/** Owner-checked. Clears the old Clerk invitation so `send`'s duplicate check
 *  on Clerk's side doesn't reject the replacement. */
export const beginResend = internalMutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "sendInvite", { key: user._id, throws: true });

    const invite = await ctx.db.get(inviteId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.inviterId !== user._id) throw new Error("That invitation isn't yours to send again.");
    if (invite.status === "accepted") throw new Error("That invitation has already been taken up.");

    // A withdrawn or lapsed letter was refunded, so reviving it spends a slot
    // again — otherwise revoke-then-resend would mint allowance out of thin air.
    if (!isUsable(invite)) {
      const allowance = allowanceFor(user);
      if ((await countSpentInvites(ctx, user._id)) >= allowance) {
        throw new Error(`Your allowance of ${allowance} invitations is spent.`);
      }
    }

    await ctx.db.patch(inviteId, { status: "pending", expiresAt: expiryFromNow() });
    return {
      email: invite.email,
      code: invite.code,
      oldClerkInvitationId: invite.clerkInvitationId ?? null,
      inviterHandle: user.handle,
    };
  },
});

// ---------------------------------------------------------------------------
// Actions — the half that talks to Clerk
// ---------------------------------------------------------------------------

async function createClerkInvitation(args: {
  email: string;
  inviterHandle: string;
  code: string;
}): Promise<{ id: string; url: string | undefined }> {
  const res = await fetch(`${CLERK_API}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: args.email,
      // Clerk's emailed link lands here with `__clerk_ticket` appended; the
      // <SignUp/> component on that page consumes it.
      redirect_url: `${appUrl()}/register`,
      public_metadata: { invitedByHandle: args.inviterHandle, inviteCode: args.code },
      notify: true,
      ignore_existing: false,
      expires_in_days: INVITE_TTL_DAYS,
    }),
  });
  if (!res.ok) throw await clerkError(res, "Clerk refused the invitation");
  const body = (await res.json()) as { id: string; url?: string };
  return { id: body.id, url: body.url };
}

async function revokeClerkInvitation(clerkInvitationId: string): Promise<void> {
  const res = await fetch(`${CLERK_API}/invitations/${clerkInvitationId}/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${clerkSecret()}` },
  });
  // 404 = already gone, 400 = already accepted/revoked. Neither is worth
  // failing the caller's revoke over — our row is the one that gates entry.
  if (!res.ok && res.status !== 404 && res.status !== 400) {
    throw await clerkError(res, "Clerk refused to withdraw the invitation");
  }
}

export const send = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ code: string; email: string; ticketUrl: string | null }> => {
    const code = generateCode();
    const reserved: { inviteId: Id<"invites">; email: string; inviterHandle: string } = await ctx.runMutation(
      internal.invites.reserve,
      { email, code },
    );

    try {
      const created = await createClerkInvitation({
        email: reserved.email,
        inviterHandle: reserved.inviterHandle,
        code,
      });
      await ctx.runMutation(internal.invites.attachClerk, {
        inviteId: reserved.inviteId,
        clerkInvitationId: created.id,
        clerkTicketUrl: created.url,
      });
      return { code, email: reserved.email, ticketUrl: created.url ?? null };
    } catch (err) {
      await ctx.runMutation(internal.invites.discard, { inviteId: reserved.inviteId });
      throw err;
    }
  },
});

export const revoke = action({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }): Promise<null> => {
    const { clerkInvitationId }: { clerkInvitationId: string | null } = await ctx.runMutation(
      internal.invites.markRevoked,
      { inviteId },
    );
    if (clerkInvitationId) await revokeClerkInvitation(clerkInvitationId);
    return null;
  },
});

export const resend = action({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }): Promise<{ ticketUrl: string | null }> => {
    const begun: {
      email: string;
      code: string;
      oldClerkInvitationId: string | null;
      inviterHandle: string;
    } = await ctx.runMutation(internal.invites.beginResend, { inviteId });

    // Clerk rejects a second invitation for an address that already has one
    // outstanding, so the old one goes first.
    if (begun.oldClerkInvitationId) await revokeClerkInvitation(begun.oldClerkInvitationId);

    const created = await createClerkInvitation({
      email: begun.email,
      inviterHandle: begun.inviterHandle,
      code: begun.code,
    });
    await ctx.runMutation(internal.invites.attachClerk, {
      inviteId,
      clerkInvitationId: created.id,
      clerkTicketUrl: created.url,
    });
    return { ticketUrl: created.url ?? null };
  },
});
