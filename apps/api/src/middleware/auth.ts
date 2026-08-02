import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../lib/auth";
import type { AppEnv } from "../types";

async function readUser(c: Context<AppEnv>) {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return;
  try {
    const payload = await verifyAuthToken(token);
    c.set("user", { id: payload.sub, handle: payload.handle });
  } catch {
    // invalid/expired token — treated as logged out, caller decides if that's fatal
  }
}

/** Blocks the request unless a valid auth cookie is present. */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  await readUser(c);
  if (!c.get("user")) return c.json({ error: "unauthorized" }, 401);
  await next();
}

/** Attaches the user if present, but never blocks. For public routes whose
 *  response shape depends on who's asking (e.g. "have I liked this tweet"). */
export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  await readUser(c);
  await next();
}
