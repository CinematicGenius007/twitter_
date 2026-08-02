import { useState } from "react";
import { Link, useParams } from "react-router";
import { MapPin, LinkSimple, PushPin } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { useProfile, useUserTweets, useUserLikes, useMyBookmarks } from "../lib/queries";
import { Avatar } from "../components/Avatar";
import { FollowButton } from "../components/FollowButton";
import { TweetCard } from "../components/TweetCard";
import { Postmark, TornEdge, InkUnderline } from "../components/Ornament";
import { LoadingSheets, Empty, ErrorNote } from "../components/States";
import { Button } from "../components/Button";
import { formatCount, joinedDate, joinedShort } from "../lib/format";

/** Drop cap — the oldest trick in typesetting for marking where prose starts,
 *  and it makes an otherwise plain bio line feel authored. */
function Bio({ bio }: { bio: string }) {
  return (
    <p className="font-body text-sm text-ink-soft mt-3 leading-relaxed">
      <span className="float-left font-display font-black text-[2.6rem] leading-[0.78] mr-1.5 mt-0.5 text-ink">
        {bio[0]}
      </span>
      {bio.slice(1)}
    </p>
  );
}

function Stat({ value, label, to }: { value: number; label: string; to?: string }) {
  const inner = (
    <>
      <span className="font-display font-bold text-base text-ink nums">{formatCount(value)}</span>{" "}
      <span className="label text-2xs text-ink-soft">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} className="hover:text-seal transition-colors">
      {inner}
    </Link>
  ) : (
    <span>{inner}</span>
  );
}

type Tab = "tweets" | "likes" | "bookmarks";

const TAB_LABEL: Record<Tab, string> = {
  tweets: "Dispatches",
  likes: "Sealed",
  bookmarks: "Filed",
};

export function ProfilePage() {
  const { handle = "" } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("tweets");

  const { data, isLoading, isError } = useProfile(handle);
  const isOwn = user?.handle.toLowerCase() === handle.toLowerCase();

  const tweetsQuery = useUserTweets(tab === "tweets" ? handle : "");
  const likesQuery = useUserLikes(tab === "likes" ? handle : "");
  const bookmarksQuery = useMyBookmarks(tab === "bookmarks" && isOwn);

  if (isLoading) return <LoadingSheets count={3} />;
  if (isError || !data) return <ErrorNote>No such correspondent is on file.</ErrorNote>;

  const profile = data.user;
  const activeQuery = tab === "tweets" ? tweetsQuery : tab === "likes" ? likesQuery : bookmarksQuery;
  const tabs: Tab[] = isOwn ? ["tweets", "likes", "bookmarks"] : ["tweets", "likes"];

  return (
    <div>
      {/* masthead plate for the correspondent */}
      <div className="relative">
        <div className="h-28 sm:h-36 bg-paper-aged border border-rule overflow-hidden relative">
          {profile.header_url ? (
            <img src={profile.header_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full opacity-60"
              style={{
                background:
                  "repeating-linear-gradient(135deg, transparent 0 9px, rgba(33,27,20,0.05) 9px 10px)",
              }}
            />
          )}
          <TornEdge color="var(--paper)" height={16} className="absolute bottom-0 left-0 right-0" flip />
        </div>

        <div className="flex items-end justify-between gap-4 -mt-10 px-1 relative">
          <div className="drop-shadow-md">
            <Avatar
              handle={profile.handle}
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              size={84}
            />
          </div>
          <div className="flex items-center gap-3 pb-1">
            <Postmark label="Joined" sub={joinedShort(profile.created_at)} className="hidden sm:inline-flex" />
            {isOwn ? (
              <Link to="/settings/profile">
                <Button size="sm" variant="secondary">
                  Edit card
                </Button>
              </Link>
            ) : (
              <FollowButton handle={profile.handle} initialFollowing={profile.viewer_following} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <h1 className="font-display font-black text-xl text-ink leading-tight">{profile.display_name}</h1>
        <p className="text-sm text-ink-faint">@{profile.handle}</p>

        {profile.bio && <Bio bio={profile.bio} />}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft mt-3 clear-both pt-1">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} weight="light" /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-indigo hover:underline underline-offset-2"
            >
              <LinkSimple size={13} weight="light" />
              {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="sm:hidden">Joined {joinedDate(profile.created_at)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 pb-4">
          <Stat value={profile.tweets_count} label="Dispatches" />
          <span className="h-3 w-px bg-rule" />
          <Stat value={profile.followers_count} label="Readers" to={`/${profile.handle}/readers`} />
          <span className="h-3 w-px bg-rule" />
          <Stat value={profile.following_count} label="Reading" to={`/${profile.handle}/reading`} />
        </div>
      </div>

      {profile.pinned_tweet && (
        <div className="mb-2">
          <p className="flex items-center gap-1.5 label text-2xs text-ink-soft tracking-[0.16em] mb-1">
            <PushPin size={12} weight="fill" className="text-seal" /> Pinned
          </p>
          <div className="ledger-margin sheet">
            <TweetCard tweet={profile.pinned_tweet} />
          </div>
        </div>
      )}

      <div className="flex border-b border-rule mt-4">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative flex-1 py-2.5 label text-2xs transition-colors ${
              tab === t ? "text-ink" : "text-ink-soft hover:text-seal"
            }`}
          >
            {TAB_LABEL[t]}
            {tab === t && <InkUnderline />}
          </button>
        ))}
      </div>

      <div className="ledger-margin">
        {activeQuery.isLoading && <LoadingSheets count={3} />}
        {activeQuery.data?.tweets.length === 0 && (
          <Empty
            title={
              tab === "tweets" ? "Nothing filed yet" : tab === "likes" ? "No seals given" : "Nothing put away"
            }
          >
            {tab === "bookmarks" ? "Dispatches you file are private to you." : undefined}
          </Empty>
        )}
        {activeQuery.data?.tweets.map((t) => <TweetCard key={t.id} tweet={t} />)}
      </div>
    </div>
  );
}
