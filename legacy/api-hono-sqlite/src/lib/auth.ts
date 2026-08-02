import { sign, verify } from "hono/jwt";

const envSecret = process.env.JWT_SECRET;
if (!envSecret) throw new Error("JWT_SECRET is not set (see apps/api/.env.example)");
const JWT_SECRET: string = envSecret;
const JWT_ALG = "HS256";

// 30 days: local single-user-at-a-time dev project, not worth a refresh-token
// flow (see docs/ARCHITECTURE.md §6 — TTL is an implementation call, not architectural).
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface AuthTokenPayload {
  sub: number;
  handle: string;
  exp: number;
}

export function signAuthToken(user: { id: number; handle: string }): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return sign({ sub: user.id, handle: user.handle, exp }, JWT_SECRET, JWT_ALG);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  return (await verify(token, JWT_SECRET, JWT_ALG)) as unknown as AuthTokenPayload;
}

export const AUTH_COOKIE_NAME = "token";
