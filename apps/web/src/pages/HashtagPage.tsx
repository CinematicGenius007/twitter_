import { useParams } from "react-router";
import { useHashtag } from "../lib/queries";
import { TweetCard } from "../components/TweetCard";
import { LoadingSheets, Empty } from "../components/States";
import { Fleuron } from "../components/Ornament";

export function HashtagPage() {
  const { tag = "" } = useParams();
  const { data, isLoading } = useHashtag(tag);

  return (
    <div>
      <div className="text-center py-6">
        <p className="label text-2xs text-ink-soft tracking-[0.2em]">On the subject of</p>
        <h1 className="font-display font-black text-2xl text-ink mt-1">#{tag}</h1>
        {data && (
          <p className="text-xs text-ink-faint mt-1 nums">
            {data.tweets.length} dispatch{data.tweets.length === 1 ? "" : "es"}
          </p>
        )}
        <Fleuron className="max-w-[160px] mx-auto mt-4" />
      </div>

      <div className="ledger-margin">
        {isLoading && <LoadingSheets />}
        {data?.tweets.length === 0 && (
          <Empty title="Nothing on this subject">No dispatches have carried this mark yet.</Empty>
        )}
        {data?.tweets.map((t) => <TweetCard key={t.id} tweet={t} />)}
      </div>
    </div>
  );
}
