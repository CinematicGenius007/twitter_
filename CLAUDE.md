# CLAUDE.md — Project Briefing

Read this first. Then read `docs/ARCHITECTURE.md` (domain model), `docs/DESIGN.md` (visual system), and `PLANNED.md` (current build checklist + status) before writing code. `docs/LOG.md` has the running narrative of what happened each session — read its last few entries to know where the previous session left off.

## 1. Product overview

A Twitter clone. College 2nd-year learning project (APIs + frontend in depth), local-only, single machine, no deployment target. Being rebuilt from scratch — a previous Express/EJS/MySQL version exists in git history only, not carried forward as code (see `docs/ARCHITECTURE.md` §8 for what was deliberately dropped and why).

## 2. Tech stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| API framework | Hono (TypeScript) |
| Database | SQLite via `bun:sqlite` (built into Bun, no native module compile step) |
| Frontend | Vite + React + TypeScript |
| Routing (frontend) | React Router |
| Data fetching | TanStack Query (planned — for caching + optimistic updates on likes/retweets) |
| Styling | Tailwind, theme extended from `apps/web/src/styles/tokens.css` (see `docs/DESIGN.md`) |
| Auth | JWT, signed, httpOnly cookie. Password hashing via `Bun.password` (argon2id) |
| Package manager | Bun (workspaces) |

No ORM decided yet — raw SQL via `bun:sqlite` is the default assumption unless a real pain point shows up. Don't add Drizzle/Prisma preemptively.

## 3. Project structure (target — see `PLANNED.md` for what's actually scaffolded so far)

```
apps/
  api/            Hono API, TS, bun:sqlite
    src/
      db/         schema.sql, migrations, seed script
      routes/     one file per resource (auth, tweets, users, ...)
      middleware/ auth (JWT verify), error handling
      lib/        password hashing, JWT sign/verify helpers
  web/            Vite + React SPA
    src/
      pages/      route-level components
      components/ reusable UI (TweetCard, Composer, LikeButton, ...)
      styles/     tokens.css (design system source of truth) + tailwind config consumes it
      lib/        API client, query hooks
docs/
  ARCHITECTURE.md  domain model, entity design, structural reference
  DESIGN.md        1890s paper design system
  LOG.md           append-only iteration log
PLANNED.md         phased build checklist with status markers, read before resuming work
```

## 4. Domain model — see `docs/ARCHITECTURE.md`

Do not re-derive the schema from scratch each session. The key decisions (unified `tweets` table with self-referential `parent_tweet_id`/`quoted_tweet_id` for replies-of-replies and quote-tweets, `retweets` as an action table not new content, denormalized trigger-maintained counters) are settled there. Read it before touching schema or API routes for tweets/likes/retweets/replies.

## 5. Design system — see `docs/DESIGN.md`

Sepia/parchment palette, Alex Brush (display only) + Playfair Display (headings) + Lora (body/UI). Tokens are the source of truth in `apps/web/src/styles/tokens.css` — Tailwind theme extends from there, never redefine colors inline in a component.

## 6. Auth & authorization

JWT in httpOnly cookie, `Bun.password` for hashing (argon2id). Reading tweets/profiles is public/unauthenticated. Mutating actions (post, like, retweet, reply, bookmark, follow) require a valid JWT. Middleware for this lives in `apps/api/src/middleware`.

## 7. Development workflow

`bun install` at root (workspaces). `bun run dev` runs both `apps/api` (:3001) and `apps/web` (:5173, proxies `/api` to :3001 in dev — see `apps/web/vite.config.ts`) concurrently. `bun run db:init` creates the sqlite file from `schema.sql`; `bun run db:seed` populates it with ~50 users / 1000 tweets (all seed users share password `password123`) — see `apps/api/src/db/seed.ts`. The API is fully built and verified (P1 in `PLANNED.md`); the frontend is still the P0 placeholder screen — P2 is next.

## 8. Conventions

- TypeScript strict mode in both apps, no `any` without a comment explaining why.
- One resource per route file in `apps/api/src/routes` (`tweets.ts`, `users.ts`, `auth.ts`, ...), matching REST verbs.
- Components in `apps/web/src/components` are presentational; data fetching lives in `apps/web/src/lib` hooks, not inline in components.
- Every new color/size in the frontend goes through `tokens.css` first — see `docs/DESIGN.md` §5.
- Extension points are documented in `docs/ARCHITECTURE.md` §7 — check there before adding a table/entity that isn't in the v1 list, to avoid scope creep the brief didn't ask for.

## 9. Do's and Don'ts

**Do:**
- Keep the `tweets` table polymorphic (original/reply/quote) — don't split replies back into their own table.
- Use SQLite triggers for count maintenance, matching the pattern already proven in the old project.
- Update `PLANNED.md` status markers and append to `docs/LOG.md` at the end of any working session, so a fresh session/agent can resume without re-deriving context.

**Don't:**
- Don't store plaintext passwords — this was a real bug in the old schema, `Bun.password` replaces it, no exceptions.
- Don't build DMs, Lists, Spaces, private accounts, or tweet edit history — permanently out of scope, not a scheduling gap (`docs/ARCHITECTURE.md` §7). Notifications are deferred (§7a) — don't build until asked.
- Don't let the cursive display font (Alex Brush) appear in body copy or UI labels — display/masthead use only.
- Don't expose `bookmarks` for any handle other than the requesting user, ever — likes are public (classic Twitter behavior), bookmarks are not (`docs/ARCHITECTURE.md` §7b).

## 10. Active plan

See `PLANNED.md` for the phased checklist and current status, and `docs/LOG.md` for session-by-session history.

---
_Last updated: 2026-08-02. P0 (scaffold) and P1 (full API: auth, tweets, feeds, follows, likes/retweets/bookmarks, hashtags, search, profile edit, seed data) complete and verified. P2 (frontend) is next._
