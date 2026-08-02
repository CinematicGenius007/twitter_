# Architecture — Domain Model & Structural Reference

> Status: living reference, not a hard contract. Extend when a real need shows up.
> Don't add structure for a feature nobody asked for — see "Extension points" at bottom before inventing new tables/entities.

This project is a from-scratch rebuild. Old MySQL/Express/EJS implementation is retired — only the *idea* of Twitter carries forward, not its schema or code. This doc is the source of truth for what "the idea of Twitter" means here, translated into entities.

## 1. Core principle: Tweet is one polymorphic entity

Real Twitter does not have separate tables for "tweet" and "reply." A reply *is* a tweet with a pointer to its parent. A quote-tweet *is* a tweet with a pointer to the tweet it quotes. This is the single most important structural decision in this rebuild — the old schema's separate `replies` table is explicitly not carried forward.

```
tweets
├── id
├── author_id        → users.id
├── body              text, nullable (nullable only for pure retweets if we ever inline them here — see §3)
├── parent_tweet_id    → tweets.id, nullable   (set  ⇒ this row is a reply)
├── quoted_tweet_id    → tweets.id, nullable   (set  ⇒ this row is a quote-tweet)
├── created_at
├── edited_at          nullable
├── likes_count         denormalized, trigger-maintained
├── retweets_count      denormalized, trigger-maintained
├── replies_count       denormalized, trigger-maintained
```

Consequences of this one decision:

- **Replies-to-replies** fall out for free. A thread is just: walk `parent_tweet_id` up, or query `WHERE parent_tweet_id = ?` down, recursively. No special-casing "reply to a reply" vs "reply to a tweet."
- **Quote-tweeting** is a tweet with its own `body` (can be empty) plus `quoted_tweet_id`. Rendering a quote-tweet means rendering the row, then embedding the quoted row's card.
- A tweet can be a reply *and* nothing else, or an original *and* nothing else, or a quote-tweet *and simultaneously a reply* (you can quote-tweet inside a thread). Both pointers being independent nullable columns supports that without extra tables.

## 2. Plain retweet is NOT a new tweet

This is the second key distinction, and it's why retweet ≠ quote-tweet architecturally:

- **Quote-tweet** = new content (even if body is empty) → lives in `tweets`.
- **Plain retweet** (repost with no comment) = an *action*, not content. It doesn't create a new tweet; it's a join row saying "this user shared this existing tweet to their followers." Same shape as a like.

```
retweets
├── id
├── tweet_id   → tweets.id   (the original being reshared)
├── user_id    → users.id    (who reshared it)
├── created_at
UNIQUE(tweet_id, user_id)
```

A user's timeline is therefore: their own tweets UNION tweets retweeted by them (joined through this table), ordered by `GREATEST(tweets.created_at, retweets.created_at)`.

## 3. Full entity list (v1 — build these)

| Entity | Shape | Notes |
|---|---|---|
| `users` | id, handle (unique), display_name, bio, location, website, avatar_url, header_url, pinned_tweet_id, password_hash, created_at | password_hash via `Bun.password` (argon2id). Never plaintext — old schema's `varchar(20)` password column does not carry forward. `location`/`website` are free-text/nullable, no validation beyond length — this is a college project, not a KYC form. `pinned_tweet_id` nullable self-ref-ish pointer into `tweets`, must belong to the same user (checked in the route, not the schema). |
| `follows` | follower_id, followee_id, created_at, UNIQUE(follower_id, followee_id) | Self-referential many-to-many on users. Drives "following" timeline vs public/global timeline. |
| `tweets` | see §1 | Unifies original / reply / quote-tweet. |
| `tweet_media` | id, tweet_id, url, kind (image/gif/video), position | 1-to-many. Real Twitter allows multiple images per tweet — one nullable `media` column (old schema) doesn't model that; a join table does. |
| `likes` | id, tweet_id, user_id, created_at, UNIQUE(tweet_id, user_id) | Same shape as old schema. Trigger maintains `tweets.likes_count`. |
| `retweets` | see §2 | Trigger maintains `tweets.retweets_count`. |
| `bookmarks` | id, tweet_id, user_id, created_at, UNIQUE(tweet_id, user_id) | **Private** — never joined into any public-facing query, no count ever exposed to other users. This is "save" from the brief. |
| `mentions` | id, tweet_id, mentioned_user_id | Parsed from `body` (`@handle`) at write time, not read time — makes profile "tagged in" queries and future notifications a plain indexed lookup instead of a regex scan per read. This is "tagging" from the brief. |
| `hashtags` | id, tag (unique, lowercase, no `#`) | |
| `tweet_hashtags` | tweet_id, hashtag_id | Join table. Parsed from `body` (`#word`) at write time, same reasoning as mentions. No counter trigger — hashtag feed is a plain join query, not hot enough at this scale to denormalize. |

`replies_count` on a tweet = `COUNT(*) WHERE parent_tweet_id = tweet.id` — maintained by trigger on `tweets` insert/delete, same pattern as likes.

## 4. Public sharing / visibility model (v1)

No private accounts, no DM, no per-tweet visibility flag in v1 — every tweet is public by default, same as real Twitter's default state. "Sharing public" means: every tweet has a stable permalink (`/{handle}/status/{id}`) that's readable without auth — same as the old project's read-mostly EJS pages, just now an SPA route that fetches from a public (unauthenticated) API endpoint. Mutating actions (like/retweet/reply/bookmark/follow) require the JWT cookie; reading does not.

Private accounts are explicitly out of scope (§7) — no `is_private` flag, don't add one.

Profile is editable by its owner only (`PATCH /api/users/me`, not `PATCH /api/users/:handle`) — `display_name`, `bio`, `location`, `website`, `avatar_url`, `header_url`, `pinned_tweet_id`. `handle` is not editable post-registration in v1 (changing it would break every existing permalink reference by handle — not worth the complexity for a college project; revisit only if asked).

## 5. Counters: triggers, not read-time aggregation

Continuing the pattern already proven in the old project (`insert_like_trigger` / `delete_like_trigger`), all three counters (`likes_count`, `retweets_count`, `replies_count`) are SQLite `AFTER INSERT` / `AFTER DELETE` triggers on their respective source tables, writing to `tweets`. This keeps feed queries to a single `SELECT` with no aggregate joins, which matters more on SQLite (no query planner tricks for hot aggregate joins) than it did on MySQL.

## 6. Auth shape

JWT, signed, delivered as an httpOnly cookie (decided in planning — not localStorage, not Authorization header, to avoid XSS token theft). Payload: `{ sub: user_id, handle }`, short expiry + refresh-on-activity, or a fixed longer expiry since this is a local single-user-at-a-time dev project — exact TTL is an implementation call, not an architectural one.

## 7. Explicitly out of scope — do not build

Not "later," not "if asked" — decided against. Don't re-propose these:

- **DMs, Lists, Spaces, private accounts** — never. No schema reserved for them.
- **Edit history** — a tweet has exactly one `edited_at` timestamp (§1). No `tweet_edits` history table, no "show previous versions." If the UI needs to indicate a tweet changed, show "edited" + the timestamp, nothing more.

## 7a. Deferred (documented, not built unless asked)

- **Notifications** — a `notifications` table fed by triggers on likes/retweets/replies/mentions/follows. The `mentions` table (§3) is designed so this slots in later without a schema change to it. No current ask for this; don't build until there is one.

## 7b. Profile-owner-only views

`likes` and `bookmarks` are both join tables (tweet_id, user_id). Two distinct views come out of them:

- **"Your likes" tab** — `SELECT tweets.* FROM likes JOIN tweets ... WHERE likes.user_id = :self`. Whether this is visible to other users or owner-only is a UI/route decision, not a schema one — likes themselves aren't private the way bookmarks are (§3), but the *aggregated list* of what someone liked can still be gated to the profile owner at the route level if that's the desired UX.
- **"Your bookmarks" tab** — same shape, but `bookmarks` stays owner-only at the route level always (§3) — never join it into any response that isn't `WHERE user_id = requesting_user`.

Both are independent of liking/bookmarking flow — bookmarking a tweet never requires liking it first, and vice versa (separate tables, no FK between them).

## 8. What deliberately did NOT carry forward from the old project

- Separate `replies` table (superseded by self-referential `tweets`, §1).
- Plaintext password storage.
- MySQL-specific syntax (`DELIMITER`, `express-mysql-session`) — SQLite triggers use the same `AFTER INSERT/DELETE` shape but SQLite's own syntax.
- Single nullable `media` varchar per tweet (superseded by `tweet_media`, §3).

---
_Last updated: 2026-08-02. Added hashtags to v1 scope, profile fields (location/website/pinned_tweet_id) + owner-only edit, explicit never-list for DM/lists/spaces/private-accounts/edit-history, and likes/bookmarks owner-view notes, per user scope decisions._
