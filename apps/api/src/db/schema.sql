-- Schema per docs/ARCHITECTURE.md. Read that doc before changing this file.
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  handle          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name    TEXT NOT NULL,
  bio             TEXT,
  location        TEXT,
  website         TEXT,
  avatar_url      TEXT,
  header_url      TEXT,
  pinned_tweet_id INTEGER REFERENCES tweets(id) ON DELETE SET NULL,
  password_hash   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_users_display_name ON users(display_name);

CREATE TABLE follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id != followee_id)
);

-- Unified content entity: original tweet, reply (parent_tweet_id set), or
-- quote-tweet (quoted_tweet_id set). Both may be set at once (quote inside a thread).
CREATE TABLE tweets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT,
  parent_tweet_id INTEGER REFERENCES tweets(id) ON DELETE CASCADE,
  quoted_tweet_id INTEGER REFERENCES tweets(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  edited_at       TEXT,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  retweets_count  INTEGER NOT NULL DEFAULT 0,
  replies_count   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tweets_author ON tweets(author_id);
CREATE INDEX idx_tweets_parent ON tweets(parent_tweet_id);
CREATE INDEX idx_tweets_quoted ON tweets(quoted_tweet_id);
CREATE INDEX idx_tweets_created ON tweets(created_at);

CREATE TABLE tweet_media (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  url      TEXT NOT NULL,
  kind     TEXT NOT NULL CHECK (kind IN ('image', 'gif', 'video')),
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_tweet_media_tweet ON tweet_media(tweet_id);

CREATE TABLE likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id   INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (tweet_id, user_id)
);

CREATE TABLE retweets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id   INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (tweet_id, user_id)
);

-- Private. Never join into a public-facing query.
CREATE TABLE bookmarks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id   INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (tweet_id, user_id)
);

-- Parsed from tweet body at write time (@handle).
CREATE TABLE mentions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id           INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  mentioned_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mentions_user ON mentions(mentioned_user_id);

-- Parsed from tweet body at write time (#word). No counter trigger — hashtag
-- feed is a plain join, not hot enough at this scale to denormalize.
CREATE TABLE hashtags (
  id  INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE tweet_hashtags (
  tweet_id   INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (tweet_id, hashtag_id)
);

CREATE INDEX idx_tweet_hashtags_hashtag ON tweet_hashtags(hashtag_id);

-- Counter triggers, same pattern as the old project's like-count triggers.

CREATE TRIGGER trg_likes_insert AFTER INSERT ON likes
BEGIN
  UPDATE tweets SET likes_count = likes_count + 1 WHERE id = NEW.tweet_id;
END;

CREATE TRIGGER trg_likes_delete AFTER DELETE ON likes
BEGIN
  UPDATE tweets SET likes_count = likes_count - 1 WHERE id = OLD.tweet_id;
END;

CREATE TRIGGER trg_retweets_insert AFTER INSERT ON retweets
BEGIN
  UPDATE tweets SET retweets_count = retweets_count + 1 WHERE id = NEW.tweet_id;
END;

CREATE TRIGGER trg_retweets_delete AFTER DELETE ON retweets
BEGIN
  UPDATE tweets SET retweets_count = retweets_count - 1 WHERE id = OLD.tweet_id;
END;

CREATE TRIGGER trg_replies_insert AFTER INSERT ON tweets
WHEN NEW.parent_tweet_id IS NOT NULL
BEGIN
  UPDATE tweets SET replies_count = replies_count + 1 WHERE id = NEW.parent_tweet_id;
END;

CREATE TRIGGER trg_replies_delete AFTER DELETE ON tweets
WHEN OLD.parent_tweet_id IS NOT NULL
BEGIN
  UPDATE tweets SET replies_count = replies_count - 1 WHERE id = OLD.parent_tweet_id;
END;
