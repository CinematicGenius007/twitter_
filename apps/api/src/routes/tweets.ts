import { Hono } from "hono";
import type { Statement } from "bun:sqlite";
import { db } from "../db/client";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { getTweetById, syncMentionsAndHashtags, toDTO, type TweetRow } from "../lib/tweets";
import type { AppEnv } from "../types";

const MAX_TWEET_LENGTH = 280;

const tweets = new Hono<AppEnv>();

const insertTweetStmt = db.query(
  `INSERT INTO tweets (author_id, body, parent_tweet_id, quoted_tweet_id)
   VALUES (?, ?, ?, ?) RETURNING *`,
);
const insertMediaStmt = db.query(
  "INSERT INTO tweet_media (tweet_id, url, kind, position) VALUES (?, ?, ?, ?)",
);
const updateBodyStmt = db.query(
  "UPDATE tweets SET body = ?, edited_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? RETURNING *",
);
const deleteTweetStmt = db.query("DELETE FROM tweets WHERE id = ?");
const repliesStmt = db.query("SELECT * FROM tweets WHERE parent_tweet_id = ? ORDER BY created_at ASC");

tweets.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const parentId = Number.isInteger(body?.parent_tweet_id) ? (body.parent_tweet_id as number) : null;
  const quotedId = Number.isInteger(body?.quoted_tweet_id) ? (body.quoted_tweet_id as number) : null;
  const media: { url: string; kind: string }[] = Array.isArray(body?.media) ? body.media : [];

  if (!quotedId && text.length === 0) {
    return c.json({ error: "body is required unless quoting a tweet" }, 400);
  }
  if (text.length > MAX_TWEET_LENGTH) {
    return c.json({ error: `body must be ${MAX_TWEET_LENGTH} characters or fewer` }, 400);
  }
  if (parentId && !getTweetById(parentId)) return c.json({ error: "parent tweet not found" }, 404);
  if (quotedId && !getTweetById(quotedId)) return c.json({ error: "quoted tweet not found" }, 404);

  const row = insertTweetStmt.get(user.id, text || null, parentId, quotedId) as TweetRow;

  media.forEach((m, i) => {
    if (typeof m.url === "string" && ["image", "gif", "video"].includes(m.kind)) {
      insertMediaStmt.run(row.id, m.url, m.kind, i);
    }
  });

  if (text) syncMentionsAndHashtags(row.id, text);

  return c.json({ tweet: toDTO(row, user.id) }, 201);
});

tweets.get("/:id", optionalAuth, (c) => {
  const id = Number(c.req.param("id"));
  const row = getTweetById(id);
  if (!row) return c.json({ error: "not found" }, 404);

  const viewerId = c.get("user")?.id ?? null;

  // walk parent_tweet_id up for the full ancestor chain (oldest first)
  const parents: TweetRow[] = [];
  let cursor = row.parent_tweet_id;
  while (cursor) {
    const parent = getTweetById(cursor);
    if (!parent) break;
    parents.unshift(parent);
    cursor = parent.parent_tweet_id;
  }

  const replies = repliesStmt.all(id) as TweetRow[];

  return c.json({
    tweet: toDTO(row, viewerId),
    parents: parents.map((p) => toDTO(p, viewerId)),
    replies: replies.map((r) => toDTO(r, viewerId)),
  });
});

tweets.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const id = Number(c.req.param("id"));
  const row = getTweetById(id);
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.author_id !== user.id) return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (text.length === 0 && !row.quoted_tweet_id) {
    return c.json({ error: "body is required" }, 400);
  }
  if (text.length > MAX_TWEET_LENGTH) {
    return c.json({ error: `body must be ${MAX_TWEET_LENGTH} characters or fewer` }, 400);
  }

  const updated = updateBodyStmt.get(text || null, id) as TweetRow;
  syncMentionsAndHashtags(id, text);

  return c.json({ tweet: toDTO(updated, user.id) });
});

tweets.delete("/:id", requireAuth, (c) => {
  const user = c.get("user")!;
  const id = Number(c.req.param("id"));
  const row = getTweetById(id);
  if (!row) return c.json({ error: "not found" }, 404);
  if (row.author_id !== user.id) return c.json({ error: "forbidden" }, 403);

  deleteTweetStmt.run(id);
  return c.json({ ok: true });
});

// Likes/retweets/bookmarks are all the same shape: a (tweet_id, user_id)
// toggle table. One route pair per action, same two statements.
function toggleStatements(table: "likes" | "retweets" | "bookmarks"): {
  insert: Statement;
  remove: Statement;
} {
  return {
    insert: db.query(`INSERT OR IGNORE INTO ${table} (tweet_id, user_id) VALUES (?, ?)`),
    remove: db.query(`DELETE FROM ${table} WHERE tweet_id = ? AND user_id = ?`),
  };
}

function mountToggle(action: string, stmts: { insert: Statement; remove: Statement }) {
  tweets.post(`/:id/${action}`, requireAuth, (c) => {
    const user = c.get("user")!;
    const id = Number(c.req.param("id"));
    if (!getTweetById(id)) return c.json({ error: "not found" }, 404);
    stmts.insert.run(id, user.id);
    return c.json({ ok: true });
  });
  tweets.delete(`/:id/${action}`, requireAuth, (c) => {
    const user = c.get("user")!;
    const id = Number(c.req.param("id"));
    stmts.remove.run(id, user.id);
    return c.json({ ok: true });
  });
}

mountToggle("like", toggleStatements("likes"));
mountToggle("retweet", toggleStatements("retweets"));
mountToggle("bookmark", toggleStatements("bookmarks"));

export default tweets;
