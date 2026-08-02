import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChatTeardrop,
  Repeat,
  Quotes,
  Seal,
  BookmarkSimple,
  PencilSimple,
  Trash,
  ArrowBendUpLeft,
} from "@phosphor-icons/react";
import { api } from "../lib/api";
import { invalidateAll } from "../lib/invalidate";
import { relativeTime, formatCount } from "../lib/format";
import type { Tweet } from "../lib/types";
import { useAuth } from "../lib/auth";
import { Avatar } from "./Avatar";
import { TweetBody } from "./TweetBody";
import { Composer } from "./Composer";
import { Tape } from "./Ornament";
import { Button } from "./Button";

const MAX_LENGTH = 280;

/*
  A filed dispatch. Notes on the choices here:

  - No box around each item. Boxes-in-a-list is the default social-app look;
    a dashed hairline plus the continuous ledger rule down the column gives
    the same separation with far more character and less visual noise.
  - Actions are icons with counts, not text labels. Six text labels per card
    ("Reply Retweet Quote Like Save Edit Delete") was the single ugliest part
    of the previous build — it read as a debug toolbar.
  - Owner controls (edit/delete) only appear on hover/focus, so they don't
    compete with the actions everyone uses.
*/

function Action({
  icon: Icon,
  count,
  title,
  active,
  activeColor = "var(--seal)",
  onClick,
}: {
  icon: typeof Seal;
  count?: number;
  title: string;
  active?: boolean;
  activeColor?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className="group/act flex items-center gap-1.5 min-h-[34px] px-1 -mx-1 text-ink-soft/75 hover:text-seal transition-colors"
      style={active ? { color: activeColor } : undefined}
    >
      <Icon size={17} weight={active ? "fill" : "light"} />
      {count !== undefined && count > 0 && (
        <span className="nums text-2xs tabular-nums">{formatCount(count)}</span>
      )}
    </button>
  );
}

export function TweetCard({
  tweet,
  showThreadLink = true,
  emphasis = false,
}: {
  tweet: Tweet;
  showThreadLink?: boolean;
  emphasis?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [liked, setLiked] = useState(tweet.viewer_liked);
  const [likesCount, setLikesCount] = useState(tweet.likes_count);
  const [retweeted, setRetweeted] = useState(tweet.viewer_retweeted);
  const [retweetsCount, setRetweetsCount] = useState(tweet.retweets_count);
  const [bookmarked, setBookmarked] = useState(tweet.viewer_bookmarked);
  const [quoting, setQuoting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(tweet.body ?? "");
  const [deleted, setDeleted] = useState(false);

  const isOwner = user?.id === tweet.author_id;

  async function toggle(
    action: "like" | "retweet" | "bookmark",
    next: boolean,
    setState: (v: boolean) => void,
    countSetter?: (fn: (n: number) => number) => void,
  ) {
    setState(next);
    countSetter?.((n) => (next ? n + 1 : n - 1));
    try {
      if (next) await api.post(`/tweets/${tweet.id}/${action}`);
      else await api.del(`/tweets/${tweet.id}/${action}`);
      invalidateAll(queryClient);
    } catch {
      setState(!next);
      countSetter?.((n) => (next ? n - 1 : n + 1));
    }
  }

  async function handleDelete() {
    if (!confirm("Destroy this dispatch? It cannot be recovered.")) return;
    await api.del(`/tweets/${tweet.id}`);
    invalidateAll(queryClient);
    setDeleted(true);
  }

  async function handleEditSave() {
    const text = editBody.trim();
    if (!text || text.length > MAX_LENGTH) return;
    await api.patch(`/tweets/${tweet.id}`, { body: text });
    invalidateAll(queryClient);
    setEditing(false);
  }

  if (deleted) return null;

  function goToThread(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a,button,textarea,input")) return;
    if (showThreadLink) navigate(`/${tweet.author.handle}/status/${tweet.id}`);
  }

  return (
    <article
      onClick={goToThread}
      className={`group relative border-t border-dashed border-rule px-4 transition-colors ${
        emphasis ? "py-6 bg-paper-bright/50" : "py-4"
      } ${showThreadLink ? "cursor-pointer hover:bg-paper-bright/60" : ""}`}
    >
      {tweet.parent_tweet_id && (
        <p className="flex items-center gap-1.5 text-2xs text-ink-faint mb-1.5 ml-[54px]">
          <ArrowBendUpLeft size={12} weight="light" />
          <span className="label tracking-wider">in reply</span>
        </p>
      )}

      <div className="flex gap-3.5">
        <Link
          to={`/${tweet.author.handle}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 mt-0.5 transition-transform hover:scale-105"
        >
          <Avatar
            handle={tweet.author.handle}
            displayName={tweet.author.display_name}
            avatarUrl={tweet.author.avatar_url}
            size={emphasis ? 52 : 40}
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* byline */}
          <div className="flex items-baseline gap-2 flex-wrap leading-tight">
            <Link
              to={`/${tweet.author.handle}`}
              onClick={(e) => e.stopPropagation()}
              className={`font-display font-bold text-ink hover:text-seal transition-colors ${
                emphasis ? "text-lg" : "text-base"
              }`}
            >
              {tweet.author.display_name}
            </Link>
            <span className="text-xs text-ink-faint">@{tweet.author.handle}</span>
            <span className="text-ink-faint text-xs">·</span>
            <time className="text-xs text-ink-faint nums" dateTime={tweet.created_at}>
              {relativeTime(tweet.created_at)}
            </time>
            {tweet.edited_at && (
              <span className="text-2xs text-ink-faint italic font-display">revised</span>
            )}
          </div>

          {/* body */}
          {editing ? (
            <div onClick={(e) => e.stopPropagation()} className="mt-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none bg-paper border border-rule p-3 font-body text-base outline-none focus:border-seal shadow-[inset_0_1px_3px_rgba(33,27,20,0.09)]"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="primary" onClick={handleEditSave}>
                  Save
                </Button>
                <Button size="sm" variant="quiet" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={emphasis ? "mt-2 text-lg" : "mt-1"}>
              <TweetBody body={tweet.body} />
            </div>
          )}

          {/* media — printed photographs, not edge-to-edge banners */}
          {tweet.media.length > 0 && (
            <div className={`mt-3 grid gap-3 ${tweet.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {tweet.media.map((m, i) => (
                <a
                  key={m.id}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="block bg-paper-bright p-2 pb-6 shadow-[var(--lift-2)] transition-transform hover:scale-[1.015] hover:rotate-0"
                  style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.9}deg)` }}
                >
                  <img src={m.url} alt="" className="w-full object-cover max-h-80" />
                </a>
              ))}
            </div>
          )}

          {/* quoted dispatch — a clipping taped into the page */}
          {tweet.quoted_tweet && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/${tweet.quoted_tweet!.author.handle}/status/${tweet.quoted_tweet!.id}`);
              }}
              className="sheet-aged relative mt-3.5 p-3 pt-3.5 cursor-pointer hover:bg-paper transition-colors"
            >
              <Tape side="left" />
              <div className="flex items-center gap-2 mb-1">
                <Avatar
                  handle={tweet.quoted_tweet.author.handle}
                  displayName={tweet.quoted_tweet.author.display_name}
                  avatarUrl={tweet.quoted_tweet.author.avatar_url}
                  size={20}
                />
                <span className="font-display font-bold text-sm text-ink">
                  {tweet.quoted_tweet.author.display_name}
                </span>
                <span className="text-2xs text-ink-faint">@{tweet.quoted_tweet.author.handle}</span>
              </div>
              <div className="text-sm">
                <TweetBody body={tweet.quoted_tweet.body} />
              </div>
            </div>
          )}

          {/* actions */}
          <div className="flex items-center gap-7 mt-2.5 -ml-1">
            <Action
              icon={ChatTeardrop}
              count={tweet.replies_count}
              title="Reply"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/${tweet.author.handle}/status/${tweet.id}`);
              }}
            />
            <Action
              icon={Repeat}
              count={retweetsCount}
              title="Reprint"
              active={retweeted}
              activeColor="var(--indigo)"
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return navigate("/login");
                void toggle("retweet", !retweeted, setRetweeted, setRetweetsCount);
              }}
            />
            <Action
              icon={Quotes}
              title="Quote"
              active={quoting}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return navigate("/login");
                setQuoting((v) => !v);
              }}
            />
            <Action
              icon={Seal}
              count={likesCount}
              title="Seal"
              active={liked}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return navigate("/login");
                void toggle("like", !liked, setLiked, setLikesCount);
              }}
            />
            <Action
              icon={BookmarkSimple}
              title="File"
              active={bookmarked}
              onClick={(e) => {
                e.stopPropagation();
                if (!user) return navigate("/login");
                void toggle("bookmark", !bookmarked, setBookmarked);
              }}
            />

            {/* owner controls stay out of the way until wanted */}
            {isOwner && !editing && (
              <span className="ml-auto flex items-center gap-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <Action
                  icon={PencilSimple}
                  title="Revise"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                  }}
                />
                <Action
                  icon={Trash}
                  title="Destroy"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete();
                  }}
                />
              </span>
            )}
          </div>

          {quoting && (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <Composer mode="quote" quotedTweet={tweet} autoFocus onSuccess={() => setQuoting(false)} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
