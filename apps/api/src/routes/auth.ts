import { Hono, type Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { db } from "../db/client";
import { AUTH_COOKIE_NAME, TOKEN_TTL_SECONDS, signAuthToken } from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";
import { serializeUser, type UserRow } from "../lib/serialize";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const HANDLE_RE = /^[a-zA-Z0-9_]{1,15}$/;

const auth = new Hono<AppEnv>();

function setAuthCookie(c: Context, token: string) {
  setCookie(c, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: false, // local-only dev over http; flip to true if this ever serves over https
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

auth.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null);
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";
  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!HANDLE_RE.test(handle)) {
    return c.json({ error: "handle must be 1-15 characters: letters, numbers, underscore" }, 400);
  }
  if (displayName.length < 1 || displayName.length > 50) {
    return c.json({ error: "display_name must be 1-50 characters" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "password must be at least 8 characters" }, 400);
  }

  const existing = db.query("SELECT id FROM users WHERE handle = ?").get(handle);
  if (existing) return c.json({ error: "handle already taken" }, 409);

  const passwordHash = await hashPassword(password);
  const result = db
    .query("INSERT INTO users (handle, display_name, password_hash) VALUES (?, ?, ?) RETURNING *")
    .get(handle, displayName, passwordHash) as UserRow;

  const token = await signAuthToken({ id: result.id, handle: result.handle });
  setAuthCookie(c, token);
  return c.json({ user: serializeUser(result) }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const row = db.query("SELECT * FROM users WHERE handle = ?").get(handle) as UserRow | null;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return c.json({ error: "invalid handle or password" }, 401);
  }

  const token = await signAuthToken({ id: row.id, handle: row.handle });
  setAuthCookie(c, token);
  return c.json({ user: serializeUser(row) });
});

auth.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

auth.get("/me", requireAuth, (c) => {
  const user = c.get("user")!;
  const row = db.query("SELECT * FROM users WHERE id = ?").get(user.id) as UserRow;
  return c.json({ user: serializeUser(row) });
});

export default auth;
