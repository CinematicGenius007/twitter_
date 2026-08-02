import { Hono } from "hono";
import { db } from "../db/client";
import { optionalAuth } from "../middleware/auth";
import { toDTO, type TweetRow } from "../lib/tweets";
import type { AppEnv } from "../types";

const hashtags = new Hono<AppEnv>();

const byTagStmt = db.query(`
  SELECT t.* FROM tweets t
  JOIN tweet_hashtags th ON th.tweet_id = t.id
  JOIN hashtags h ON h.id = th.hashtag_id
  WHERE h.tag = ?
  ORDER BY t.id DESC LIMIT 50
`);

hashtags.get("/:tag", optionalAuth, (c) => {
  const tag = (c.req.param("tag") ?? "").toLowerCase();
  const viewerId = c.get("user")?.id ?? null;
  const rows = byTagStmt.all(tag) as TweetRow[];
  return c.json({ tag, tweets: rows.map((r) => toDTO(r, viewerId)) });
});

export default hashtags;
