import { Hono } from "hono";
import { db } from "../db/client";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { toDTO, type TweetRow } from "../lib/tweets";
import type { AppEnv } from "../types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function parseLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function parseBefore(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
}

const feed = new Hono<AppEnv>();

// Global timeline: top-level tweets/quote-tweets (no replies buried in), newest first.
const publicFeedStmt = db.query(
  "SELECT * FROM tweets WHERE parent_tweet_id IS NULL AND id < ? ORDER BY id DESC LIMIT ?",
);

feed.get("/public", optionalAuth, (c) => {
  const limit = parseLimit(c.req.query("limit"));
  const before = parseBefore(c.req.query("before"));
  const viewerId = c.get("user")?.id ?? null;

  const rows = publicFeedStmt.all(before, limit) as TweetRow[];
  return c.json({ tweets: rows.map((r) => toDTO(r, viewerId)) });
});

// Following timeline: your own tweets + tweets from people you follow.
// NOTE: doesn't interleave retweets yet (known simplification — see
// docs/ARCHITECTURE.md §2 for why retweets are an action, not new content;
// surfacing them in this feed is a query addition, not a schema change).
const followingFeedStmt = db.query(`
  SELECT t.* FROM tweets t
  WHERE t.parent_tweet_id IS NULL
    AND t.id < ?
    AND (t.author_id = ? OR t.author_id IN (SELECT followee_id FROM follows WHERE follower_id = ?))
  ORDER BY t.id DESC LIMIT ?
`);

feed.get("/following", requireAuth, (c) => {
  const user = c.get("user")!;
  const limit = parseLimit(c.req.query("limit"));
  const before = parseBefore(c.req.query("before"));

  const rows = followingFeedStmt.all(before, user.id, user.id, limit) as TweetRow[];
  return c.json({ tweets: rows.map((r) => toDTO(r, user.id)) });
});

export default feed;
