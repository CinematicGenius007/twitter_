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

## 2026-08-02 — Committed P0+P1, built full P2 frontend

Session scope: user said the P0 design direction looked good, asked to commit what existed and keep building the frontend while they review separately.

Committed: everything from P0+P1 (the from-scratch rebuild — API, schema, seed script, docs) in one commit on `main`. Found and cleaned up a stray `apps/apps/api/...` directory before staging — an earlier `mkdir -p apps/api/...` had run while the shell's cwd was already inside `apps/`, silently duplicating the path one level down with a few empty `.gitkeep`/`.gitignore` placeholders. No real content was lost; `apps/api/uploads/.gitignore` was recreated at the correct path.

Built all of `PLANNED.md` P2 (frontend):
- `lib/` layer: `api.ts`, `types.ts` (mirrors backend DTOs), `auth.tsx` (React context around `/api/auth/*`), `queries.ts` (TanStack Query hooks), `format.ts`, `invalidate.ts`
- Shared components: `Layout`, `Avatar`, `TweetBody` (linkified mentions/hashtags), `TweetCard`, `Composer`, `FollowButton`
- Pages: Login, Register, Feed (Everyone/Following tabs), TweetPage (thread), ProfilePage (Tweets/Likes/Saved tabs, drop-cap bio, pinned tweet), EditProfilePage, SearchPage, HashtagPage, NotFoundPage
- Routing wired in `App.tsx`/`main.tsx` (`react-router` v8 — confirmed the plain `react-router` package exports `BrowserRouter`/`Link`/etc. directly, no need for a separate `react-router-dom` install)

Decisions:
- Retweet vs. quote-tweet UI: reply always routes to the tweet's own detail page (composer lives there, matches real product pattern); quote-tweet is a small inline composer that expands directly under the `TweetCard` being quoted — kept both self-contained, no cross-page compose-modal state needed.
- Optimistic like/retweet/bookmark updates are local `useState` inside each `TweetCard` instance (instant click feedback), backed by a blanket `queryClient.invalidateQueries()` after every mutation to keep every other cached view (feed/profile/thread/hashtag) eventually consistent. Precise per-cache-key surgery would be more "correct" but is overkill at this app's scale.
- Pagination: feeds fetch the API's max `limit=50` with no "load more" UI. Documented as a known simplification in both `PLANNED.md` and a code comment, not silently dropped.

Bug found and fixed (browser-testing `EditProfilePage`): the form's fields rendered empty on a fresh page load at `/settings/profile`. Root cause — `useAuth()`'s `user` resolves asynchronously (`GET /auth/me` fires on `AuthProvider` mount), so on a hard navigation the form's `useState(user?.display_name ?? "")` initializers ran while `user` was still `null` and never re-synced once it loaded (`useState` initializers only apply on first mount). There was also a real side-effect-during-render bug in the same component — `navigate("/login")` was being called directly in the render body instead of an effect. Fixed both: a `useEffect` syncs the form fields whenever `user` changes, and the redirect is now a separate `useEffect` gated on `!loading && !user`. Verified the fix by reloading the page directly and confirming fields populate, then saving a location change and confirming it persisted to the profile view.

Verified in-browser (Chrome via the Browser pane, against live seeded data, not curl this time):
- Feed renders correctly (fonts, quote-tweet embeds, hashtag/mention links) before login
- Login against a seeded user, composer appears
- Posted a tweet with a live `#hashtag` and `@mention` — both linkified correctly, clicking `#hashtag` opened the hashtag page
- Like toggled instantly (count + color), Edit/Delete only shown for own tweets
- Profile page: drop-cap bio, stats, pinned tweet, Likes tab (showing both own liked tweet and a seeded one), Saved tab only appears on own profile
- Followed another seeded user from their profile — button and follower count updated live
- Search returned matching seeded users
- Zero console errors across every page visited

Left off (superseded by the next entry): P0-P2 all done and verified. Dev servers were left running (`bun run dev`, api :3001 / web :5173) for the user to look at directly while reviewing. Nothing has been reset since the manual browser testing, so the dev DB has a few extra rows from that session (one real tweet, one like, one follow, one profile edit) — harmless, not committed (db file is gitignored), but worth knowing if counts look slightly off from a fresh `db:seed`. Next: `PLANNED.md` P3 — media upload, paper texture/ornament pass, responsive layout, styled empty/error states. Nothing committed this session yet (P2 work is uncommitted).

---

## 2026-08-02 — Renamed to Penny Post; design system rebuilt; P3 shipped

Session scope: user committed the P0+P1 work, then gave two directives: (1) drop the "Nebula" name, (2) the theme implementation "is AI slop and not well thought of" — rebuild it properly, with an inspiration image supplied (a vintage-camping hospitality site: torn paper, layered photographs, typewriter body text, postal stamps, a dark burlap footer). Explicitly asked to think through *every* component including the circular avatar, and to do this together with P3 rather than as a separate pass.

Naming: asked the user rather than picking unilaterally. They chose **Penny Post** — the 1840 postal reform that made sending a message cheap enough for anyone, which is the same premise as the product, so the name carries thematic weight rather than being decoration. They also asked for Phosphor icons and period vocabulary where it fits.

Diagnosis of what was actually wrong (written up in `docs/DESIGN.md` §0 so it doesn't get repeated):
1. **No value range** — every surface within a few percent of the same beige, so nothing had depth or a focal point. Adding a genuinely dark band was the single biggest fix.
2. **No texture** — a "paper" theme with no paper in it.
3. **Generic body face** — a stock web serif says nothing.
4. **Ornament as garnish** — a cursive logo bolted onto an otherwise default layout.
5. **Text labels for actions** — seven words in a row under every post read as a debug toolbar.

Governing rule adopted: **chrome carries the period, content stays modern and legible.** Masthead/footer/ground/ornament can be as 19th-century as they like; running text sits on clean high-contrast paper, and ornament never goes behind words. That's what lets a 1000-item feed stay scannable while still feeling like a printed object.

Built:
- Tokens rewritten — new palette with a real value range plus a dark band; **two accent inks** (seal red for actions/state, indigo for references/links) so a link is never confusable with a button; depth scale including a hard-offset "printing plate" shadow; generated grain/laid/ruled/torn textures (SVG turbulence + CSS gradients, ~1kb, no bitmaps).
- Three-font system, three non-overlapping jobs: **Pinyon Script** (wordmark only, once per page), **Playfair Display** (headings + small-caps labels), **Courier Prime** (all body and metadata). Switching body copy to a typewriter face was the highest-leverage single change — period-honest, legible, and instantly not-a-default-web-app. Alex Brush and Lora dropped.
- **Wax-seal avatars** — the component the user called out. Generated lobed perimeter, radial dome highlight, letterpress initials, ±4.5° tilt, wax colour picked deterministically from a curated set of seven historical wax colours (curated rather than random hue — random hues are exactly what makes generated palettes look synthetic). Same silhouette with or without an uploaded image.
- `TweetCard` rebuilt: no boxes (dashed hairlines + a ledger rule down the column), Phosphor icon actions with tabular counts, owner controls hidden until hover/focus, quoted posts as taped clippings on aged stock, media as tilted photo prints.
- `Composer` rebuilt as a telegram form: printed heading, ruled writing surface, character allowance as a stamp that inks up and only shows a figure near the limit.
- `Layout` rebuilt: newspaper flag with a live dateline (issue no. + today's date + "Price One Penny"), sticky nav with the flag allowed to scroll away, torn-edge dark footer with a colophon.
- New primitives: `Ornament.tsx` (TornEdge, Tape, Postmark, Fleuron, Watermark, InkUnderline), `Button.tsx` (letterpress plate + shared Field/input), `States.tsx` (content-shaped skeletons, empty, error, section heads), `UserRow.tsx`.
- **P3 media upload end-to-end**: `POST /api/media` (auth-required, 5MB cap, mime whitelist, server-generated UUID filenames — the client's filename is never used to build a path), `GET /api/media/:name` behind a strict filename pattern, composer attach UI, photo-print rendering. Served under `/api/media/*` so the existing Vite proxy covers it with no extra config.
- Followers/Following pages added — the new profile stats linked to `/:handle/readers` and `/:handle/reading`, which didn't exist yet.
- Responsive, accessibility, empty/loading states per `docs/DESIGN.md` §6.

Bugs found and fixed during browser verification:
- Wax seals rendered as dark muddy blobs with illegible initials at 40px — the wax palette was too dark and the dome gradient crushed the edges. Lightened the seven wax colours, added a mid-stop to the gradient, and raised the initial contrast (near-white catch-edge over a darker impression).
- The ledger rule was originally placed at `left: 62px`, i.e. *between* the seal and the text — which splits a unit that reads as one thing. Moved to the far left of the column with all content to its right, which is both more authentic to accounts paper and less disruptive.
- Tape on quoted clippings was invisible (too translucent, beige on beige). Raised opacity, added a light top edge and a real shadow.
- The join-date postmark overflowed its 74px circle ("September 2024"). Added a `joinedShort` formatter.
- `PATCH /api/users/me` stored cleared optional fields as `""` rather than `NULL`, so every "is this set?" check had to know about two empty values. Now normalises to `NULL` (display_name excepted — it's required, so an empty one is ignored).

Verified in-browser: feed, thread, profile, edit-profile, search, hashtag, mobile at 375px. Zero console errors. Media pipeline verified by curl including the negative cases (path traversal → 404, non-image → 415, unauthenticated → 401).

Left off: P0-P3 complete. Dev servers left running (api :3001 / web :5173). Dev DB has a handful of rows from manual testing (a dispatch with an attached image, some seals/follows) — harmless, gitignored. P2 and this design work are uncommitted as of writing. Possible next work is listed as P5 in `PLANNED.md` (feed pagination, reprints in the Subscriptions feed, avatar/banner upload UI, an actual test suite) — none of it committed to.

---
