import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth";
import { useFeed } from "../lib/queries";
import { Composer } from "../components/Composer";
import { TweetCard } from "../components/TweetCard";
import { LoadingSheets, Empty, ErrorNote } from "../components/States";
import { InkUnderline } from "../components/Ornament";

const TABS = [
  { key: "public", label: "The Wire" },
  { key: "following", label: "Subscriptions" },
] as const;

export function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"public" | "following">("public");
  const { data, isLoading, isError } = useFeed(tab);

  return (
    <div>
      {user ? (
        <div className="mb-5">
          <Composer />
        </div>
      ) : (
        <div className="sheet px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-ink-soft">
            Reading as a member of the public.
          </p>
          <Link to="/register" className="label text-2xs text-seal hover:underline underline-offset-4">
            Take out a subscription →
          </Link>
        </div>
      )}

      <div className="flex border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            disabled={t.key === "following" && !user}
            className={`relative flex-1 py-2.5 label text-2xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              tab === t.key ? "text-ink" : "text-ink-soft hover:text-seal"
            }`}
          >
            {t.label}
            {tab === t.key && <InkUnderline />}
          </button>
        ))}
      </div>

      <div className="ledger-margin">
        {isLoading && <LoadingSheets />}
        {isError && <ErrorNote>The wire is down. Try again shortly.</ErrorNote>}
        {data && data.tweets.length === 0 && (
          <Empty title={tab === "following" ? "No subscriptions yet" : "The wire is quiet"}>
            {tab === "following"
              ? "Follow a few correspondents and their dispatches will appear here."
              : "Nothing has come over the wire yet. Be the first to file."}
          </Empty>
        )}
        {data?.tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)}
      </div>
    </div>
  );
}
