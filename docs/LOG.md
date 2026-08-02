# Iteration Log

Append-only. One entry per work session, newest at the bottom. This is narrative ("what happened and why"), not status tracking — status lives in `PLANNED.md`. Read the last 2-3 entries before resuming work in a fresh session.

Entry format:

```
## YYYY-MM-DD — short title
Session scope: what was worked on.
Decisions: anything decided that isn't already written into CLAUDE.md/ARCHITECTURE.md/DESIGN.md (if it's durable, it should also be written there — this log is the "why now" trail, not the only record).
Done: what got finished (bullet, links to PLANNED.md items if applicable).
Left off: exact state if stopped mid-task — what's half-done, what to check first next session.
```

---

## 2026-08-02 — Rebuild kickoff: architecture, design system, planning docs

Session scope: User wants a full revamp of the old Express/EJS/MySQL Twitter clone (college 2nd-year project) into a modern local-only stack, plus an 1890s-paper visual redesign. Decided to rebuild from scratch rather than port the old app — old code kept only as git history, not carried forward.

Decisions:
- Stack: Bun runtime + Hono API + `bun:sqlite`, Vite + React + TS frontend, JWT-in-httpOnly-cookie auth. Chosen over Astro (feed/likes/replies app is almost entirely dynamic, so Astro's islands model buys little) and over Node+better-sqlite3 (Bun's built-in SQLite/TS/test-runner remove tooling overhead for a solo learning project).
- Domain model: unified `tweets` table with self-referential `parent_tweet_id` (replies, arbitrary depth) and `quoted_tweet_id` (quote-tweets), replacing the old separate `replies` table. Plain retweets modeled as an action table (like `likes`), not new content. Bookmarks are private, never exposed in public queries. Mentions parsed and stored at write time for future notification/tagging queries. Full reasoning in `docs/ARCHITECTURE.md`.
- Design: sepia/parchment palette, Alex Brush (display-only) + Playfair Display (headings) + Lora (body), SVG-generated paper grain rather than a texture image, no dark mode in v1. Full spec in `docs/DESIGN.md`.
- Scope discipline: hashtags, notifications, edit-history, private accounts/DMs explicitly parked as documented-but-not-built extension points, so future sessions don't invent them ad hoc or re-debate whether they're in scope.

Done:
- `docs/ARCHITECTURE.md` — domain model and structural reference
- `docs/DESIGN.md` — 1890s paper design system
- `CLAUDE.md` — project briefing
- `PLANNED.md` — phased build checklist (P0-P4)
- This log, seeded

Left off: about to retire the old app files and scaffold `apps/api` / `apps/web`. Next session (or next step this session): start at `PLANNED.md` P0, top item.

---

## 2026-08-02 — P0 scaffolding

Session scope: continuation of the same session above — executed `PLANNED.md` P0 top to bottom.

Done:
- Old app retired: `index.js`, `views/`, `database.sql`, `public/`, old MySQL `.env` moved into `legacy/` via `git mv` (history intact, nothing hard-deleted)
- Root Bun workspace (`apps/*`), root `package.json` with `dev`/`db:init`/`db:seed` scripts, `.gitignore` rewritten for the new layout
- `apps/api`: Hono skeleton, strict `tsconfig.json`, `/health` route, `.env.example`
- `apps/api/src/db/schema.sql`: full schema per `docs/ARCHITECTURE.md` §3, all six counter triggers (likes/retweets/replies, insert+delete each)
- `apps/api/src/db/client.ts` + `init.ts` + `seed.ts` (seed is a placeholder — see PLANNED.md P0 note, real seed data waits on the password-hashing lib in P1)
- `apps/web`: scaffolded via `bun create vite web --template react-ts`, then stripped of default template content (counter demo, logos, hero image, unused CSS)
- Tailwind v4 wired via `@tailwindcss/vite`; `apps/web/src/styles/tokens.css` holds the raw design tokens from `docs/DESIGN.md`, mapped into Tailwind's `@theme` in `index.css`
- Fonts self-hosted via `@fontsource/alex-brush`, `@fontsource/playfair-display`, `@fontsource/lora` — no runtime Google Fonts fetch
- `react-router` and `@tanstack/react-query` installed (not wired into routes/queries yet — that's P1/P2)

Bugs hit and fixed:
- `db/client.ts` opened the sqlite file before `init.ts`'s `mkdirSync` ran (import order), threw `SQLITE_CANTOPEN`. Fixed by moving the `mkdirSync` into `client.ts` itself, ahead of `new Database(...)`.

Verified:
- `bun run dev` from repo root boots both `apps/api` (Hono, :3001) and `apps/web` (Vite, :5173) concurrently, no errors
- `GET /health` → `{"ok":true}`
- Schema smoke test: inserted users/tweets/a reply, then a like and a retweet — `likes_count`, `retweets_count`, `replies_count` all incremented correctly via triggers. Test data reset afterward, dev DB is clean.
- `apps/web` typechecks clean (`tsc --noEmit`)
- Loaded `localhost:5173` in-browser — masthead in Alex Brush, heading in Playfair Display, body in Lora, sepia/parchment palette, hairline rule all rendering as designed

Left off: P0 fully done except the seed script's actual data (intentionally deferred to P1). Nothing uncommitted has been committed — working tree has the moves/new files but no git commit made this session. Next: `PLANNED.md` P1, starting with `apps/api/src/lib/password.ts` (`Bun.password` wrapper) and the auth routes.

---

## 2026-08-02 — Scope expansion + full P1 API build

Session scope: user reviewed the P0 scaffold (liked the design), then expanded scope before continuing: real accounts + editable own profile, hashtags promoted from "maybe later" to v1, edit history explicitly rejected (just `edited_at`, confirmed no history table — already how it was built), DM/Lists/Spaces/private-accounts confirmed permanently out of scope, a "your likes" + "your bookmarks" view (bookmarking never requires liking first), user search, and a fuller profile (asked to use judgment on which fields — added `location`, `website`, `pinned_tweet_id`). Also asked for seed data: 50+ users, 1000 tweets spread randomly over time, some users with zero tweets.

Decisions (all written into `docs/ARCHITECTURE.md` before touching code):
- Hashtags: `hashtags` + `tweet_hashtags` join table, same write-time-parsing pattern as mentions, no counter trigger (not hot enough to denormalize at this scale).
- `users` gained `location`, `website`, `pinned_tweet_id` (self-ref into `tweets`, `ON DELETE SET NULL`). Profile is owner-editable only via `PATCH /api/users/me`; handle is not editable post-registration (would break permalinks).
- Likes tab is public (classic Twitter behavior); bookmarks stay owner-only always, enforced at the route level, never joined into any response for a handle that isn't the requesting user.
- `docs/ARCHITECTURE.md` §7 rewritten: split into "explicitly out of scope, do not build" (DM/Lists/Spaces/private accounts/edit-history — permanent) vs "deferred, not asked for yet" (notifications only).

Built (all of `PLANNED.md` P1):
- `apps/api/src/lib/password.ts`, `lib/auth.ts` (JWT via `hono/jwt`, had to pass the algorithm explicitly as a 3rd arg — this Hono version has no default), `middleware/auth.ts` (`requireAuth`/`optionalAuth`), `types.ts` (shared `AppEnv` for Hono's `Variables`)
- `lib/serialize.ts` (strips `password_hash` before any response), `lib/parse.ts` (mention/hashtag regex extraction), `lib/tweets.ts` (shared `TweetDTO` builder — one level of quote-tweet embedding, viewer like/retweet/bookmark flags, `syncMentionsAndHashtags`)
- Routes: `routes/auth.ts`, `routes/tweets.ts` (create/get-with-thread/edit/delete/like/retweet/bookmark), `routes/feed.ts` (public + following, cursor-paginated), `routes/users.ts` (profile/edit/search/follow/followers/following/likes-tab/bookmarks-tab), `routes/hashtags.ts`
- Schema updated: `users.handle` and `hashtags.tag` both got `COLLATE NOCASE` (handles are case-insensitive, simplifies mention matching — extract the raw `@handle` text and look it up directly, no manual lowercasing)
- `db/seed.ts`: 50 users (8 deliberately author zero tweets), 1000 tweets (700/200/100 original/reply/quote split, replies can target other replies for real thread depth), realistic Indian-college-student names/bios/locations, ~35% of tweets get 1-2 hashtags, ~15% get a mention, random like/retweet/bookmark pass across all (tweet, user) pairs, ~30% of users with tweets get a pinned one. All wrapped in one `db.transaction` for speed (ran in well under a second). All seed users share password `password123`.

Bugs hit and fixed:
- Hono route files register `/:handle` and static sibling paths (`/search`, `/me`, `/me/bookmarks`) as separate `.get()` calls rather than one fluent chain — TS then can't statically prove `"handle"` is a valid param name, so `c.req.param("handle")` typed as `string | undefined` everywhere in `routes/users.ts`. Fixed with `?? ""` at each call site (empty string just matches no user, safe).
- `hono/jwt`'s `sign`/`verify` don't default the algorithm in the installed version — `verify` errored "Expected 3 arguments, but got 2". Fixed by passing `"HS256"` explicitly, defined once as `JWT_ALG` in `lib/auth.ts`.
- First seed.ts draft called `hashPassword()` (async) synchronously inside `db.transaction()`'s callback (which bun:sqlite requires to be synchronous) and cast the resulting Promise straight to `string` — would have written a stringified Promise into every user's `password_hash`. Fixed by hashing once via top-level `await` *before* calling the transaction, closing over the resolved value.
- `apps/api/tsconfig.json` referenced a `"bun-types"` package that isn't what's actually installed (`@types/bun`) — silently would have left the API essentially untyped. Fixed the `types` array.

Verified (curl against a running server, then again against the full seeded dataset):
- Register/login/me, cookie-based session
- Tweet create with inline `@mention`/`#hashtag` → correctly parsed and queryable
- Reply, quote-tweet (with one-level embed, confirmed a quote-of-a-quote doesn't recurse), thread fetch (parents + replies)
- Like/follow, profile aggregate counts, `viewer_following`/`viewer_liked` flags
- User search, hashtag lookup, both feeds (public and following, following correctly includes own tweets + followed users only)
- Owner-only bookmarks endpoint, public likes-tab endpoint
- Seed data: exact counts (50/1000/700/200/100/8-zero-tweet-users), zero trigger/count mismatches across likes/retweets/replies, login against a seeded user's hashed password works

Left off: P1 fully done and verified. Nothing committed this session (or the prior one) — user hasn't asked for a commit yet. Next: `PLANNED.md` P2 — core frontend (auth pages, feed, TweetCard, Composer, thread page, profile page + edit, hashtag page, search).

---
