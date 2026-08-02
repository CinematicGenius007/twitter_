import { Hono } from "hono";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

const UPLOAD_DIR = resolve(import.meta.dir, "../../uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024;

// Whitelist drives BOTH validation and the stored extension. The client's
// filename is never used to build a path — that's the path-traversal hole.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

// Only ever matches names this server generated.
const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;

const media = new Hono<AppEnv>();

media.post("/", requireAuth, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) return c.json({ error: "no file provided" }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: "file must be 5MB or smaller" }, 413);

  const ext = ALLOWED[file.type];
  if (!ext) return c.json({ error: "only jpeg, png, gif or webp images are allowed" }, 415);

  const name = `${crypto.randomUUID()}.${ext}`;
  await Bun.write(resolve(UPLOAD_DIR, name), file);

  return c.json({
    url: `/api/media/${name}`,
    kind: ext === "gif" ? "gif" : "image",
  }, 201);
});

media.get("/:name", async (c) => {
  const name = c.req.param("name") ?? "";
  if (!SAFE_NAME.test(name)) return c.json({ error: "not found" }, 404);

  const file = Bun.file(resolve(UPLOAD_DIR, name));
  if (!(await file.exists())) return c.json({ error: "not found" }, 404);

  return new Response(file, {
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
});

export default media;
