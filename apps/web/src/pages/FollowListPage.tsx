import { Link, useParams } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react";
import { useFollowList } from "../lib/queries";
import { UserRow } from "../components/UserRow";
import { LoadingSheets, Empty, ErrorNote } from "../components/States";

export function FollowListPage({ kind }: { kind: "followers" | "following" }) {
  const { handle = "" } = useParams();
  const { data, isLoading, isError } = useFollowList(handle, kind);

  const title = kind === "followers" ? "Readers" : "Reading";

  return (
    <div>
      <Link
        to={`/${handle}`}
        className="inline-flex items-center gap-1.5 label text-2xs text-ink-soft hover:text-seal transition-colors py-3"
      >
        <ArrowLeft size={13} weight="light" /> @{handle}
      </Link>

      <h1 className="font-display font-black text-xl text-ink mb-1">{title}</h1>
      <p className="text-xs text-ink-faint mb-2">
        {kind === "followers"
          ? `Correspondents who receive @${handle}'s dispatches.`
          : `Correspondents @${handle} subscribes to.`}
      </p>

      {isLoading && <LoadingSheets count={4} />}
      {isError && <ErrorNote>Could not fetch that list.</ErrorNote>}
      {data?.users.length === 0 && (
        <Empty title={kind === "followers" ? "No readers yet" : "Not reading anyone yet"} />
      )}
      {data?.users.map((u) => <UserRow key={u.id} user={u} />)}
    </div>
  );
}
