import { Hono } from "hono";
import { db } from "../db/client";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { getTweetById, toDTO, type TweetRow } from "../lib/tweets";
import { serializeUser, type UserRow } from "../lib/serialize";
import type { AppEnv } from "../types";

const users = new Hono<AppEnv>();

const findByHandle = db.query("SELECT * FROM users WHERE handle = ?");
const tweetsCountStmt = db.query("SELECT COUNT(*) as n FROM tweets WHERE author_id = ?");
const followersCountStmt = db.query("SELECT COUNT(*) as n FROM follows WHERE followee_id = ?");
const followingCountStmt = db.query("SELECT COUNT(*) as n FROM follows WHERE follower_id = ?");
const isFollowingStmt = db.query("SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?");

function profileDTO(row: UserRow, viewerId: number | null) {
  const pinned = row.pinned_tweet_id ? getTweetById(row.pinned_tweet_id) : undefined;

  return {
    ...serializeUser(row),
    tweets_count: (tweetsCountStmt.get(row.id) as { n: number }).n,
    followers_count: (followersCountStmt.get(row.id) as { n: number }).n,
    following_count: (followingCountStmt.get(row.id) as { n: number }).n,
    viewer_following: viewerId ? !!isFollowingStmt.get(viewerId, row.id) : false,
    pinned_tweet: pinned ? toDTO(pinned, viewerId) : null,
  };
}

// --- static routes first: Hono matches these ahead of the dynamic /:handle below ---

users.get("/search", (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json({ users: [] });
  const rows = db
    .query("SELECT * FROM users WHERE handle LIKE ? OR display_name LIKE ? ORDER BY handle LIMIT 20")
    .all(`%${q}%`, `%${q}%`) as UserRow[];
  return c.json({ users: rows.map(serializeUser) });
});

users.patch("/me", requireAuth, async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);

  const fields: Record<string, string | number | null> = {};
  for (const key of ["display_name", "bio", "location", "website", "avatar_url", "header_url"] as const) {
    if (typeof body?.[key] !== "string") continue;
    const value = body[key].trim();
    // Store a cleared optional field as NULL, not "" — otherwise every
    // "is this set?" check has to know about two different empty values.
    // display_name is required, so an empty one is simply ignored.
    if (key === "display_name") {
      if (value) fields[key] = value;
    } else {
      fields[key] = value || null;
    }
  }
  if (body && "pinned_tweet_id" in body) {
    const pid = body.pinned_tweet_id;
    if (pid === null) {
      fields.pinned_tweet_id = null;
    } else if (Number.isInteger(pid)) {
      const t = getTweetById(pid);
      if (!t || t.author_id !== user.id) return c.json({ error: "pinned tweet must be your own" }, 400);
      fields.pinned_tweet_id = pid;
    }
  }

  if (Object.keys(fields).length === 0) return c.json({ error: "nothing to update" }, 400);

  const setClause = Object.keys(fields)
    .map((k) => `${k} = ?`)
    .join(", ");
  const row = db
    .query(`UPDATE users SET ${setClause} WHERE id = ? RETURNING *`)
    .get(...Object.values(fields), user.id) as UserRow;

  return c.json({ user: profileDTO(row, user.id) });
});

users.get("/me/bookmarks", requireAuth, (c) => {
  const user = c.get("user")!;
  const rows = db
    .query(
      `SELECT t.* FROM tweets t JOIN bookmarks b ON b.tweet_id = t.id
       WHERE b.user_id = ? ORDER BY b.id DESC LIMIT 50`,
    )
    .all(user.id) as TweetRow[];
  return c.json({ tweets: rows.map((t) => toDTO(t, user.id)) });
});

// --- dynamic /:handle routes ---

users.get("/:handle", optionalAuth, (c) => {
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  const viewerId = c.get("user")?.id ?? null;
  return c.json({ user: profileDTO(row, viewerId) });
});

users.get("/:handle/tweets", optionalAuth, (c) => {
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  const viewerId = c.get("user")?.id ?? null;
  const rows = db
    .query("SELECT * FROM tweets WHERE author_id = ? ORDER BY id DESC LIMIT 50")
    .all(row.id) as TweetRow[];
  return c.json({ tweets: rows.map((t) => toDTO(t, viewerId)) });
});

// Public — classic Twitter behavior, anyone can see what a user liked.
// (Bookmarks stay owner-only at /me/bookmarks above — see docs/ARCHITECTURE.md §7b.)
users.get("/:handle/likes", optionalAuth, (c) => {
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  const viewerId = c.get("user")?.id ?? null;
  const rows = db
    .query(
      `SELECT t.* FROM tweets t JOIN likes l ON l.tweet_id = t.id
       WHERE l.user_id = ? ORDER BY l.id DESC LIMIT 50`,
    )
    .all(row.id) as TweetRow[];
  return c.json({ tweets: rows.map((t) => toDTO(t, viewerId)) });
});

users.get("/:handle/followers", (c) => {
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  const rows = db
    .query(
      `SELECT u.* FROM users u JOIN follows f ON f.follower_id = u.id
       WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    )
    .all(row.id) as UserRow[];
  return c.json({ users: rows.map(serializeUser) });
});

users.get("/:handle/following", (c) => {
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  const rows = db
    .query(
      `SELECT u.* FROM users u JOIN follows f ON f.followee_id = u.id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`,
    )
    .all(row.id) as UserRow[];
  return c.json({ users: rows.map(serializeUser) });
});

users.post("/:handle/follow", requireAuth, (c) => {
  const user = c.get("user")!;
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.id === user.id) return c.json({ error: "cannot follow yourself" }, 400);
  db.query("INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)").run(user.id, row.id);
  return c.json({ ok: true });
});

users.delete("/:handle/follow", requireAuth, (c) => {
  const user = c.get("user")!;
  const row = findByHandle.get(c.req.param("handle") ?? "") as UserRow | null;
  if (!row) return c.json({ error: "not found" }, 404);
  db.query("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?").run(user.id, row.id);
  return c.json({ ok: true });
});

export default users;
