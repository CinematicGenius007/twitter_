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

## P2 — Core Frontend (Depends on: P1 for data; design tokens can start in parallel with P0) — DONE, verified in-browser against seeded data

- [x] `apps/web/src/styles/tokens.css` + Tailwind theme wired to it, fonts self-hosted via `@fontsource/*` (Alex Brush, Playfair Display, Lora) — done during P0 scaffolding, verified visually
- [x] `lib/` layer: `api.ts` (fetch wrapper), `types.ts` (DTOs mirroring backend), `auth.tsx` (React context wrapping `/api/auth/*`, exposes `refresh()` for post-edit resync), `queries.ts` (TanStack Query hooks per resource), `format.ts`, `invalidate.ts` (single `invalidateAll` used after every mutation — simpler than hand-tracking which query keys a given action touches, cheap enough at this scale)
- [x] Shared components: `Layout` (masthead header, search bar, auth nav), `Avatar` (initials fallback, double-ring border), `TweetBody` (linkifies `@mention`/`#hashtag`), `TweetCard` (reply/retweet/quote/like/save actions with local optimistic state, inline edit/delete for the owner, embedded quoted-tweet card), `Composer` (shared for new tweet/reply/quote via `mode` prop), `FollowButton`
- [x] Auth pages: Login, Register
- [x] Feed page — Everyone/Following tabs, composer at top when logged in. Pagination capped at the API's `limit=50` max with no "load more" UI — known simplification, fine at this scale
- [x] Tweet detail page — full ancestor chain rendered above, direct replies below, reply composer inline
- [x] Profile page — bio with drop cap, Tweets/Likes/Saved tabs (Saved only shown on your own profile — bookmarks stay owner-only per `docs/ARCHITECTURE.md` §7b), follow button, follower/following/tweet counts, location/website/joined date, pinned tweet
- [x] Profile edit page (`/settings/profile`) — own profile only, all `PATCH /api/users/me` fields
- [x] Edit tweet flow — inline textarea swap in `TweetCard`, owner-only
- [x] Hashtag page (`/hashtag/:tag`) — `#tag` in any tweet body is a working link
- [x] User search page (`/search?q=`) — hits `GET /api/users/search`, also reachable from the header search bar

## P3 — Polish + design rebuild (Depends on: P2) — DONE, verified in-browser

Done together as one pass, because the polish items and the design overhaul touched the same files.

- [x] **Renamed to Penny Post** (was "Nebula"). The 1840 penny-post reform — cheap messages for everyone — is the same premise as the product, so the name does thematic work. Wordmark, `<title>`, footer colophon, docs all updated
- [x] **Design system rebuilt from scratch** — the first pass was flat and generic. See `docs/DESIGN.md` §0 for the five specific failure modes and the fixes. Headlines: a real value range with a dark contrast band, a typewriter body face, generated paper texture, ornament confined to edges
- [x] Tokens rewritten (`apps/web/src/styles/tokens.css`) — new palette (two inks: seal red for actions, indigo for references), depth scale, generated grain/laid/ruled/torn textures
- [x] Three-font system: Pinyon Script (wordmark only) / Playfair Display (headings + small-caps labels) / Courier Prime (all body + metadata). Alex Brush and Lora dropped
- [x] **Wax-seal avatars** — lobed generated perimeter, dome highlight, letterpress initials, deterministic wax colour from a curated set of seven. Replaces the flat initials circle
- [x] Phosphor icons (`@phosphor-icons/react`) throughout, replacing the row of text action labels
- [x] `TweetCard` rebuilt — dashed rules instead of boxes, ledger margin down the column, icon actions, hover-revealed owner controls, taped quote clippings, media as tilted photo prints
- [x] `Composer` rebuilt as a telegram form — ruled paper, stamp-style character allowance, attach control
- [x] `Layout` rebuilt — newspaper flag with live dateline, sticky nav, torn-edge dark footer with colophon
- [x] New primitives: `Ornament.tsx` (TornEdge, Tape, Postmark, Fleuron, Watermark, InkUnderline), `Button.tsx` (letterpress plate), `States.tsx` (skeletons, empty, error, section heads), `UserRow.tsx`
- [x] All pages restyled; period vocabulary applied (see `docs/DESIGN.md` §7)
- [x] **Media upload end-to-end** — `POST /api/media` (auth-required, 5MB cap, mime whitelist, server-generated UUID filenames), `GET /api/media/:name` (strict filename pattern), composer attach UI, photo-print rendering. Verified: upload, serve, path-traversal blocked, non-image rejected, unauthenticated rejected
- [x] Followers/Following pages added (`/:handle/readers`, `/:handle/reading`) — the profile stats linked to routes that didn't exist
- [x] Responsive pass — search field takes its own row on mobile, verified at 375px
- [x] Empty/error/loading states in the paper's voice; skeletons shaped like content instead of spinners
- [x] Accessibility: AAA body contrast, AA secondary, focus-visible rings, `prefers-reduced-motion`, ≥34px tap targets

## P4 — Deferred / explicitly out of scope

- Never build: DMs, Lists, Spaces, private accounts, tweet edit history (see `docs/ARCHITECTURE.md` §7 — user decision, not a scheduling gap).
- Deferred, not asked for yet: notifications table (§7a). Don't build until there's a real ask.

## P5 — Possible next (nothing committed to)

- [ ] Feed pagination / "load more" — currently capped at the API's `limit=50` with no continuation UI
- [ ] Interleave reprints into the Subscriptions feed (query change only, no schema work — see `apps/api/src/routes/feed.ts`)
- [ ] Upload UI for avatar/banner — the API accepts URLs today, so `/api/media` could feed those fields directly
- [ ] Automated tests (`bun test`) — everything so far is verified by curl and browser, not by a suite

---
_Last updated: 2026-08-02. P0-P3 complete and verified in-browser. Renamed to Penny Post and the design system was rebuilt from scratch in the P3 pass — read `docs/DESIGN.md` before touching any UI._
