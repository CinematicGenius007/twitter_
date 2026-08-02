# CLAUDE.md — Project Briefing

Read this first. Then read `docs/ARCHITECTURE.md` (domain model), `docs/DESIGN.md` (visual system), and `PLANNED.md` (current build checklist + status) before writing code. `docs/LOG.md` has the running narrative of what happened each session — read its last few entries to know where the previous session left off.

## 1. Product overview

**Penny Post** — a Twitter clone dressed as an 1880s penny paper. College 2nd-year learning project (APIs + frontend in depth), local-only, single machine, no deployment target. Rebuilt from scratch — a previous Express/EJS/MySQL version exists in git history and `legacy/`, not carried forward as code (see `docs/ARCHITECTURE.md` §8 for what was deliberately dropped and why).

The name is load-bearing: the 1840 Penny Post made sending a message cheap enough that anyone could, which is the product's premise. The UI vocabulary follows from it (dispatches, the wire, seals, filing) — see `docs/DESIGN.md` §7.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| API framework | Hono (TypeScript) |
| Database | SQLite via `bun:sqlite` (built into Bun, no native module compile step) |
| Frontend | Vite + React + TypeScript |
| Routing (frontend) | React Router |
| Data fetching | TanStack Query (planned — for caching + optimistic updates on likes/retweets) |
| Styling | Tailwind v4, theme extended from `apps/web/src/styles/tokens.css` (see `docs/DESIGN.md`) |
| Icons | `@phosphor-icons/react` — `light` weight by default, `fill` for active state |
| Fonts | Pinyon Script / Playfair Display / Courier Prime, self-hosted via `@fontsource/*` |
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
      styles/     tokens.css (design system source of truth), consumed by @theme in index.css
      lib/        api client, auth context, query hooks, formatters
docs/
  ARCHITECTURE.md  domain model, entity design, structural reference
  DESIGN.md        1890s paper design system
  LOG.md           append-only iteration log
PLANNED.md         phased build checklist with status markers, read before resuming work
```

## 4. Domain model — see `docs/ARCHITECTURE.md`

Do not re-derive the schema from scratch each session. The key decisions (unified `tweets` table with self-referential `parent_tweet_id`/`quoted_tweet_id` for replies-of-replies and quote-tweets, `retweets` as an action table not new content, denormalized trigger-maintained counters) are settled there. Read it before touching schema or API routes for tweets/likes/retweets/replies.

## 5. Design system — read `docs/DESIGN.md` before touching any UI

The system was rebuilt once already, because the first attempt was flat and generic. `docs/DESIGN.md` §0 records the exact failure modes so they aren't repeated — read it, not just the token list.

Governing rule: **chrome carries the period, content stays modern and legible.** Masthead, footer, page ground and ornament can be fully 19th-century; running text sits on clean high-contrast paper, and ornament never goes behind words.

Tokens in `apps/web/src/styles/tokens.css` are the single source of truth — Tailwind's `@theme` maps from them. Never hardcode a colour in a component.

## 6. Auth & authorization

JWT in httpOnly cookie, `Bun.password` for hashing (argon2id). Reading tweets/profiles is public/unauthenticated. Mutating actions (post, like, retweet, reply, bookmark, follow) require a valid JWT. Middleware for this lives in `apps/api/src/middleware`.

## 7. Development workflow

`bun install` at root (workspaces). `bun run dev` runs both `apps/api` (:3001) and `apps/web` (:5173, proxies `/api` to :3001 in dev — see `apps/web/vite.config.ts`) concurrently. `bun run db:init` creates the sqlite file from `schema.sql`; `bun run db:seed` populates it with ~50 users / 1000 tweets (all seed users share password `password123`) — see `apps/api/src/db/seed.ts`.

Uploaded media is served from `/api/media/*` (not a separate static path) so the existing Vite proxy covers it with no extra config. Files land in `apps/api/uploads/`, gitignored.

P0-P3 are complete and verified. There is no test suite yet — verification so far is curl plus in-browser checks.

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
- Don't let the script face (Pinyon Script) appear anywhere but the wordmark — once per page, never in UI, never small.
- Don't put text labels on post actions — they're Phosphor icons with counts. A row of words under every post was a specific thing that got rebuilt.
- Don't expose `bookmarks` for any handle other than the requesting user, ever — likes are public (classic Twitter behavior), bookmarks are not (`docs/ARCHITECTURE.md` §7b).

## 10. Active plan

See `PLANNED.md` for the phased checklist and current status, and `docs/LOG.md` for session-by-session history.

---
_Last updated: 2026-08-02. P0-P3 complete and verified in-browser. Renamed Nebula → Penny Post, and the design system was rebuilt from scratch (typewriter body face, real value range with a dark band, generated paper texture, wax-seal avatars, Phosphor icons, period vocabulary) alongside P3's media upload. Read `docs/DESIGN.md` before any UI work._
