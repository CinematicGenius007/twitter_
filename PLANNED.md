# PLANNED.md — Build Checklist & Checkpoints

Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md` before resuming. Read `docs/LOG.md`'s last 1-2 entries for session-to-session narrative context.

**Status markers**: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked (note why beside it)

**Rule for any session/agent picking this up**: work top to bottom within a priority tier, respect "Depends on" notes, mark status inline as you go, append an entry to `docs/LOG.md` when you stop (even mid-task) — don't leave the next session guessing what state things are in.

---

## P0 — Foundation (blocks everything else)

- [x] Retire old app (`index.js`, `views/`, `database.sql`, `public/`, old `.env`) — moved to `legacy/` via `git mv` (history preserved)
- [x] Root `package.json` with Bun workspaces (`apps/*`), root `.gitignore` updated (`node_modules`, sqlite files, `apps/api/uploads/*`, `.env`)
- [x] `apps/api` skeleton — Hono entry point, TS config (strict), `/health` route, dev script. Verified: `bun run --cwd apps/api dev` boots, `GET /health` → `{"ok":true}`
- [x] `apps/web` skeleton — Vite+React+TS scaffold, Tailwind v4 (`@tailwindcss/vite`) installed, default template cruft removed, dev script. Verified in browser: fonts/tokens/paper theme render correctly at localhost:5173
- [x] `apps/api/src/db/schema.sql` — full schema per `docs/ARCHITECTURE.md` §3 (users, follows, tweets, tweet_media, likes, retweets, bookmarks, mentions) + counter triggers per §5. Verified: smoke-tested insert/like/retweet/reply — `likes_count`/`retweets_count`/`replies_count` all incremented correctly via triggers
- [x] DB init script (`bun run db:init`) and seed script (`bun run db:seed`) both done and working — see P1 seed entry below
- [x] Root `bun run dev` runs both apps concurrently via `concurrently` — verified both servers boot clean together

## P1 — Core API (Depends on: P0) — DONE, verified via curl against seeded data

- [x] `apps/api/src/lib/password.ts` (`Bun.password` argon2id), `apps/api/src/lib/auth.ts` (JWT sign/verify via `hono/jwt`), `apps/api/src/middleware/auth.ts` (`requireAuth`/`optionalAuth`)
- [x] Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — httpOnly cookie, 30-day TTL
- [x] Tweets: `POST /api/tweets` (original/reply/quote), `GET /api/tweets/:id` (single + full parent chain + direct replies), `PATCH /api/tweets/:id` (owner-only, sets `edited_at`), `DELETE /api/tweets/:id` (owner-only)
- [x] Feed: `GET /api/feed/public`, `GET /api/feed/following` — cursor pagination via `?before=<id>&limit=`. Known simplification: following feed doesn't interleave retweets yet (noted in `apps/api/src/routes/feed.ts`)
- [x] Likes/Retweets/Bookmarks: `POST`/`DELETE /api/tweets/:id/{like,retweet,bookmark}` — same toggle-table shape for all three
- [x] Follows: `POST`/`DELETE /api/users/:handle/follow`, `GET /api/users/:handle/{followers,following}`
- [x] Mentions + hashtags: parsed from tweet body at write time (`apps/api/src/lib/parse.ts` + `syncMentionsAndHashtags` in `apps/api/src/lib/tweets.ts`), re-synced on edit
- [x] Hashtags promoted from deferred to v1 scope (user decision) — `GET /api/hashtags/:tag`
- [x] User profile: `GET /api/users/:handle` (counts, `viewer_following`, pinned tweet embed), `PATCH /api/users/me` (owner-only — display_name/bio/location/website/avatar_url/header_url/pinned_tweet_id)
- [x] User search: `GET /api/users/search?q=` (handle/display_name `LIKE`)
- [x] `GET /api/users/:handle/likes` (public, classic-Twitter-style), `GET /api/users/me/bookmarks` (owner-only, never exposed for other handles)
- [x] Seed script (`apps/api/src/db/seed.ts`, run via `bun run db:seed`): 50 users (8 deliberately with zero tweets), 1000 tweets (700 original / 200 reply / 100 quote) spread randomly over ~2 years, ~400 follows, ~2450 likes, ~1000 retweets, ~800 bookmarks, hashtags/mentions woven into bodies, ~30% of users with tweets have a pinned one. All seed users share password `password123`. Verified: trigger counts match actual join-table counts exactly (0 mismatches)

## P2 — Core Frontend (Depends on: P1 for data; design tokens can start in parallel with P0)

- [x] `apps/web/src/styles/tokens.css` + Tailwind theme wired to it, fonts self-hosted via `@fontsource/*` (Alex Brush, Playfair Display, Lora) — done during P0 scaffolding, verified visually
- [ ] Auth pages: Login, Register
- [ ] Feed page — public/following toggle, infinite scroll or pagination (implementation call)
- [ ] `TweetCard` — like/retweet/reply/bookmark actions, optimistic updates (TanStack Query)
- [ ] `Composer` — new tweet / reply / quote-tweet (shared component, mode prop)
- [ ] Tweet detail page — parent chain rendered up, replies rendered down recursively
- [ ] Profile page — bio with drop cap, tabs (tweets/likes/bookmarks-if-own-profile), follow button, followers/following counts, location/website/pinned tweet
- [ ] Profile edit page/modal — own profile only, fields per `PATCH /api/users/me`
- [ ] Edit tweet flow
- [ ] Hashtag page (`/hashtag/:tag`) and clickable `#tag` rendering inside tweet bodies
- [ ] User search page/bar — hits `GET /api/users/search`

## P3 — Polish (Depends on: P2)

- [ ] Media upload — `tweet_media`, local disk storage under `apps/api/uploads`, multi-image composer UI
- [ ] Paper texture background (SVG noise), avatar double-ring frame, hairline dividers
- [ ] Responsive pass (mobile column width, composer)
- [ ] Empty/error/loading states styled to the paper theme, not framework defaults

## P4 — Deferred / explicitly out of scope

- Never build: DMs, Lists, Spaces, private accounts, tweet edit history (see `docs/ARCHITECTURE.md` §7 — user decision, not a scheduling gap).
- Deferred, not asked for yet: notifications table (§7a). Don't build until there's a real ask.

---
_Last updated: 2026-08-02. P0 and P1 complete and verified end-to-end (curl smoke tests + seeded data, see docs/LOG.md). P2 (core frontend) is next._
