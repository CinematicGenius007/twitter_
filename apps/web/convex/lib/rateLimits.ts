import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

// Keyed by resolved app userId (post-auth-check), not IP — Convex functions
// don't see raw client IP the way Hono middleware did, and per-user is the
// more meaningful limit for a social app anyway.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  postTweet: { kind: "token bucket", rate: 5, period: MINUTE },
  toggleAction: { kind: "token bucket", rate: 30, period: MINUTE }, // like/retweet/bookmark/follow
  mediaUpload: { kind: "token bucket", rate: 10, period: MINUTE },
  completeProfile: { kind: "fixed window", rate: 3, period: HOUR }, // anti handle-squatting
  // Invites cost real email sends against Clerk's own 100/hour instance-wide
  // limit, so this is deliberately tighter than the app's other buckets.
  sendInvite: { kind: "fixed window", rate: 5, period: HOUR },
});
