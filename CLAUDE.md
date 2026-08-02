# CLAUDE.md — Project Briefing

Read this first. Then read `docs/ARCHITECTURE.md` (domain model), `docs/DESIGN.md` (visual system), and `PLANNED.md` (current build checklist + status) before writing code. `docs/LOG.md` has the running narrative of what happened each session — read its last few entries to know where the previous session left off.

## 1. Product overview

**Penny Post** — a Twitter clone dressed as an 1880s penny paper. Originally a local-only college learning project, now being hardened for real hosting (auth, security, rate limiting) on Convex + Clerk + Vercel. Rebuilt from scratch twice — a previous Express/EJS/MySQL version and the original Bun/Hono/SQLite backend both exist in git history and `legacy/`, not carried forward as code (see `docs/ARCHITECTURE.md` §8 for what was deliberately dropped and why).

The name is load-bearing: the 1840 Penny Post made sending a message cheap enough that anyone could, which is the product's premise. The UI vocabulary follows from it (dispatches, the wire, seals, filing) — see `docs/DESIGN.md` §7.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Runtime | Bun (frontend tooling only now — no Bun server process) |
| Backend | Convex — database + serverless functions, `apps/web/convex/` |
| Frontend | Vite + React + TypeScript |
| Routing (frontend) | React Router |
| Data fetching | TanStack Query, wrapping one-shot Convex `query`/`mutation` calls (kept deliberately instead of Convex's own reactive `useQuery` — see `docs/LOG.md`) |
| Styling | Tailwind v4, theme extended from `apps/web/src/styles/tokens.css` (see `docs/DESIGN.md`) |
| Icons | `@phosphor-icons/react` — `light` weight by default, `fill` for active state |
| Fonts | Pinyon Script / Playfair Display / Courier Prime, self-hosted via `@fontsource/*` |
| Auth | Clerk (`@clerk/clerk-react`), `ConvexProviderWithClerk` bridges Clerk identity into Convex functions |
| Rate limiting | `@convex-dev/rate-limiter`, keyed by resolved app user id |
| File storage | Convex file storage (`ctx.storage`) — not local disk |
| Hosting | Convex (backend, own deployment) + Vercel (static frontend build) |
| Package manager | Bun (workspaces) |

Old stack (Bun/Hono/`bun:sqlite`, custom JWT) lives on read-only in `legacy/api-hono-sqlite/` — do not resurrect it or partially mix patterns from it into `convex/`.

## 3. Project structure (target — see `PLANNED.md` for what's actually scaffolded so far)

```
apps/
  web/            Vite + React SPA
    convex/       Convex backend — schema + functions, one file per resource
      schema.ts     table definitions, indexes
      auth.config.ts  Clerk JWT issuer config
      convex.config.ts  registers @convex-dev/rate-limiter
      tweets.ts users.ts follows.ts feed.ts hashtags.ts bookmarks.ts media.ts
      lib/        shared helpers (auth resolution, counters, mention/hashtag parsing, DTO serialization)
      _generated/ Convex codegen output, gitignored
    src/
      pages/      route-level components
      components/ reusable UI (TweetCard, Composer, LikeButton, ...)
      styles/     tokens.css (design system source of truth), consumed by @theme in index.css
      lib/        convex client, auth hook, TanStack Query wrapper hooks, formatters
legacy/
  api-hono-sqlite/  retired Bun/Hono/SQLite backend, kept for reference only
docs/
  ARCHITECTURE.md  domain model, entity design, structural reference
  DESIGN.md        1890s paper design system
  LOG.md           append-only iteration log
PLANNED.md         phased build checklist with status markers, read before resuming work
```

## 4. Domain model — see `docs/ARCHITECTURE.md`

Do not re-derive the schema from scratch each session. The key decisions (unified `tweets` table with self-referential `parentTweetId`/`quotedTweetId` for replies-of-replies and quote-tweets, `retweets` as an action table not new content, denormalized counters) are settled there and now live in `apps/web/convex/schema.ts`. Convex has no triggers — counters are maintained explicitly inside mutations (`convex/lib/counters.ts`), and there's no `ON DELETE CASCADE` — `tweets.remove` deletes child rows (replies, media, likes, retweets, bookmarks, hashtag links) manually. Read `docs/ARCHITECTURE.md` before touching schema or Convex functions for tweets/likes/retweets/replies.

## 5. Design system — read `docs/DESIGN.md` before touching any UI

The system was rebuilt once already, because the first attempt was flat and generic. `docs/DESIGN.md` §0 records the exact failure modes so they aren't repeated — read it, not just the token list.

Governing rule: **chrome carries the period, content stays modern and legible.** Masthead, footer, page ground and ornament can be fully 19th-century; running text sits on clean high-contrast paper, and ornament never goes behind words.

Tokens in `apps/web/src/styles/tokens.css` are the single source of truth — Tailwind's `@theme` maps from them. Never hardcode a colour in a component.

## 6. Auth & authorization

Clerk owns all credentials — no password hashing or JWT signing in this codebase. `ConvexProviderWithClerk` (wired in `main.tsx`) passes Clerk's identity into every Convex function via `ctx.auth.getUserIdentity()`. Reading tweets/profiles is public/unauthenticated. Mutating functions (post, like, retweet, reply, bookmark, follow, profile edits) resolve the caller's identity, look up their app-level `users` row (`convex/lib/auth.ts`'s `getCurrentUser`/`requireCurrentUser`), and check ownership before writing — there's no middleware layer, this check is repeated per-function by convention.

Clerk doesn't know about app-specific profile fields (handle, bio, etc.), so sign-up isn't fully lazy: after Clerk auth, a user with no `users` row is routed to `/complete-profile` to claim a handle via `users.completeProfile`.

**Bookmarks stay private** — every bookmarks function derives the owner from `ctx.auth` only, never accepts a `userId`/`handle` argument (`convex/bookmarks.ts`). Don't add a bookmarks query/mutation that takes someone else's id as an argument, even for an admin/debug case.

## 7. Development workflow

`bun install` at root (workspaces). `bun run dev` runs `apps/web`'s Vite dev server and `bunx convex dev` concurrently. Convex needs a one-time interactive login (`bunx convex dev` from `apps/web`) to create/link a deployment — can't be scripted headlessly. Clerk needs a dashboard-created app with its Convex integration activated to get `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and `CLERK_JWT_ISSUER_DOMAIN` (set via `bunx convex env set`, backend).

No seed script yet for the Convex backend (the old `bun run db:seed` was SQLite-specific and lived in the now-retired `apps/api`) — fresh Convex deployments start empty.

Uploaded media goes through Convex file storage (`ctx.storage.generateUploadUrl`/`getUrl`) — not a local disk path, not proxied through Vite. MIME whitelist and 5MB cap are enforced server-side in the mutation that attaches the `storageId`, not at upload time (the upload URL itself accepts anything).

P0-P3 (original Hono/SQLite build) and P6 (Convex/Clerk rewrite) are complete and verified in-browser. There is still no automated test suite — verification so far is the Convex dashboard function runner plus in-browser checks.

## 8. Conventions

- TypeScript strict mode, no `any` without a comment explaining why.
- One resource per file in `apps/web/convex` (`tweets.ts`, `users.ts`, `follows.ts`, `feed.ts`, `hashtags.ts`, `bookmarks.ts`, `media.ts`), each exporting `query`/`mutation` functions with `v` validators on every arg.
- Components in `apps/web/src/components` are presentational; data fetching lives in `apps/web/src/lib` hooks, not inline in components.
- Every new color/size in the frontend goes through `tokens.css` first — see `docs/DESIGN.md` §5.
- Extension points are documented in `docs/ARCHITECTURE.md` §7 — check there before adding a table/entity that isn't in the v1 list, to avoid scope creep the brief didn't ask for.

## 9. Do's and Don'ts

**Do:**
- Keep the `tweets` table polymorphic (original/reply/quote) — don't split replies back into their own table.
- Maintain counters explicitly inside the same mutation as the insert/delete that changes them (`convex/lib/counters.ts`) — Convex has no trigger mechanism, this is the trigger-equivalent, and it must stay atomic with the write it's counting.
- Update `PLANNED.md` status markers and append to `docs/LOG.md` at the end of any working session, so a fresh session/agent can resume without re-deriving context.

**Don't:**
- Don't hand-roll auth, password storage, or JWTs — Clerk owns all of that now. No exceptions, no "just for this one admin route" bypass.
- Don't build DMs, Lists, Spaces, private accounts, or tweet edit history — permanently out of scope, not a scheduling gap (`docs/ARCHITECTURE.md` §7). Notifications are deferred (§7a) — don't build until asked.
- Don't let the script face (Pinyon Script) appear anywhere but the wordmark — once per page, never in UI, never small.
- Don't put text labels on post actions — they're Phosphor icons with counts. A row of words under every post was a specific thing that got rebuilt.
- Don't expose `bookmarks` for any handle other than the requesting user, ever — likes are public (classic Twitter behavior), bookmarks are not (`docs/ARCHITECTURE.md` §7b). Convex functions enforce this by never accepting a userId argument for bookmarks, not by a permission check that could be forgotten.
- Don't add a Convex mutation that skips rate limiting because it "seems low-risk" — check `convex/lib/rateLimits.ts` for the existing buckets before deciding a new one is needed.

## 10. Active plan

See `PLANNED.md` for the phased checklist and current status, and `docs/LOG.md` for session-by-session history.

---
_Last updated: 2026-08-02. P0-P3 (Hono/SQLite backend, now retired to `legacy/api-hono-sqlite/`) and P6 (Convex + Clerk rewrite) both complete and verified in-browser. Deploy to Convex prod + Vercel is the next open item. Read `docs/DESIGN.md` before any UI work, `docs/ARCHITECTURE.md` before touching the schema or Convex functions._
