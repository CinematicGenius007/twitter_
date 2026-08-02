import { useParams, Link } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { useTweetThread } from "../lib/queries";
import { TweetCard } from "../components/TweetCard";
import { Composer } from "../components/Composer";
import { LoadingSheets, ErrorNote, Empty, SectionHead } from "../components/States";

export function TweetPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError } = useTweetThread(id ?? "");

  if (isLoading) return <LoadingSheets count={3} />;
  if (isError || !data) return <ErrorNote>That dispatch is not in the archive.</ErrorNote>;

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 label text-2xs text-ink-soft hover:text-seal transition-colors py-3"
      >
        <ArrowLeft size={13} weight="light" /> Back to the wire
      </Link>

      <div className="ledger-margin">
        {data.parents.map((p) => (
          <TweetCard key={p.id} tweet={p} />
        ))}

        {/* the dispatch in question, given more room and larger type */}
        <TweetCard tweet={data.tweet} showThreadLink={false} emphasis />
      </div>

      {user && (
        <div className="my-5">
          <Composer mode="reply" parentTweetId={data.tweet.id} />
        </div>
      )}

      <SectionHead>
        {data.replies.length > 0 ? `${data.replies.length} Repl${data.replies.length === 1 ? "y" : "ies"}` : "Replies"}
      </SectionHead>

      <div className="ledger-margin">
        {data.replies.length === 0 && <Empty title="No replies yet">Be the first to respond.</Empty>}
        {data.replies.map((r) => (
          <TweetCard key={r.id} tweet={r} />
        ))}
      </div>
    </div>
  );
}
