import { Hono } from "hono";
import auth from "./routes/auth";
import feed from "./routes/feed";
import hashtags from "./routes/hashtags";
import tweets from "./routes/tweets";
import users from "./routes/users";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/auth", auth);
app.route("/api/tweets", tweets);
app.route("/api/feed", feed);
app.route("/api/users", users);
app.route("/api/hashtags", hashtags);

export default {
  port: process.env.PORT ?? 3001,
  fetch: app.fetch,
};
