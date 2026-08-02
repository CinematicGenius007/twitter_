import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, X, PaperPlaneTilt } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { invalidateAll } from "../lib/invalidate";
import type { Tweet } from "../lib/types";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { useAuth } from "../lib/auth";

const MAX_LENGTH = 280;
const MAX_MEDIA = 4;

/** Character allowance as a postal stamp that inks up as you write.
 *  A number alone is dead space; this reads at a glance and turns red
 *  the moment you're over — no counting required. */
function Allowance({ used }: { used: number }) {
  const pct = Math.min(used / MAX_LENGTH, 1);
  const over = used > MAX_LENGTH;
  const near = used > MAX_LENGTH * 0.85;
  const r = 11;
  const circ = 2 * Math.PI * r;

  return (
    <span className="relative inline-flex items-center justify-center" title={`${used}/${MAX_LENGTH}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
        <circle cx="15" cy="15" r={r} fill="none" stroke="var(--rule)" strokeWidth="2" />
        <circle
          cx="15"
          cy="15"
          r={r}
          fill="none"
          stroke={over ? "var(--seal)" : near ? "var(--seal-bright)" : "var(--ink-soft)"}
          strokeWidth="2"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          className="transition-all duration-200"
        />
      </svg>
      {(near || over) && (
        <span
          className={`absolute nums text-2xs font-bold ${over ? "text-seal" : "text-ink-soft"}`}
        >
          {MAX_LENGTH - used}
        </span>
      )}
    </span>
  );
}

interface ComposerProps {
  mode?: "tweet" | "reply" | "quote";
  parentTweetId?: number;
  quotedTweet?: Tweet;
  placeholder?: string;
  autoFocus?: boolean;
  onSuccess?: (tweet: Tweet) => void;
}

export function Composer({
  mode = "tweet",
  parentTweetId,
  quotedTweet,
  placeholder,
  autoFocus,
  onSuccess,
}: ComposerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [body, setBody] = useState("");
  const [media, setMedia] = useState<{ url: string; kind: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const requiresBody = mode !== "quote";
  const overLimit = body.length > MAX_LENGTH;
  const hasContent = body.trim().length > 0 || media.length > 0;
  const canSubmit = !submitting && !uploading && !overLimit && (hasContent || !requiresBody);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || media.length >= MAX_MEDIA) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = (await res.json()) as { url?: string; kind?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "upload failed");
      setMedia((m) => [...m, { url: data.url!, kind: data.kind ?? "image" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't attach that.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ tweet: Tweet }>("/tweets", {
        body: body.trim() || undefined,
        parent_tweet_id: parentTweetId,
        quoted_tweet_id: quotedTweet?.id,
        media,
      });
      setBody("");
      setMedia([]);
      invalidateAll(queryClient);
      onSuccess?.(res.tweet);
    } catch {
      setError("Couldn't send that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = mode === "reply" ? "Reply" : mode === "quote" ? "Remark" : "New Dispatch";

  return (
    <form onSubmit={handleSubmit} className="sheet relative">
      {/* form header — the printed heading on a blank telegram form */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-dashed border-rule">
        <span className="label text-2xs text-ink-soft">{heading}</span>
        <span className="label text-2xs text-ink-faint tracking-widest">No. ____</span>
      </div>

      <div className="flex gap-3 p-4">
        <Avatar handle={user.handle} displayName={user.display_name} avatarUrl={user.avatar_url} size={40} />

        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              placeholder ??
              (mode === "reply"
                ? "Compose your reply…"
                : mode === "quote"
                  ? "Add your remark…"
                  : "What is worth reporting?")
            }
            autoFocus={autoFocus}
            rows={mode === "tweet" ? 3 : 2}
            className="w-full resize-none bg-transparent font-body text-base text-ink outline-none placeholder:text-ink-faint leading-7"
            style={{ background: "var(--ruled)", backgroundAttachment: "local" }}
          />

          {media.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {media.map((m, i) => (
                <div key={m.url} className="relative bg-paper-bright p-1.5 pb-4 shadow-[var(--lift-1)]">
                  <img src={m.url} alt="" className="h-24 w-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => setMedia((cur) => cur.filter((_, j) => j !== i))}
                    aria-label="Remove attachment"
                    className="absolute -top-2 -right-2 bg-ink text-paper-bright w-5 h-5 flex items-center justify-center hover:bg-seal transition-colors"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {quotedTweet && (
            <div className="sheet-aged p-2.5 mt-3 text-sm">
              <span className="font-display font-bold text-ink">{quotedTweet.author.display_name}</span>{" "}
              <span className="text-2xs text-ink-faint">@{quotedTweet.author.handle}</span>
              <p className="truncate text-ink-soft">{quotedTweet.body}</p>
            </div>
          )}

          {error && <p className="text-xs text-seal mt-2">{error}</p>}

          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={media.length >= MAX_MEDIA || uploading}
                title="Enclose an image"
                aria-label="Enclose an image"
                className="text-ink-faint hover:text-seal disabled:opacity-30 transition-colors min-h-[34px] flex items-center"
              >
                <Paperclip size={18} weight="light" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFile}
                className="hidden"
              />
              {uploading && <span className="text-2xs text-ink-faint italic">enclosing…</span>}
            </div>

            <div className="flex items-center gap-3">
              <Allowance used={body.length} />
              <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
                <PaperPlaneTilt size={13} weight="fill" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
