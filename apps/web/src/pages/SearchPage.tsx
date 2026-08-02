import { useSearchParams } from "react-router";
import { useSearchUsers } from "../lib/queries";
import { UserRow } from "../components/UserRow";
import { LoadingSheets, Empty } from "../components/States";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { data, isLoading } = useSearchUsers(q);

  return (
    <div>
      <div className="py-4">
        <p className="label text-2xs text-ink-soft tracking-[0.18em]">Directory</p>
        <h1 className="font-display font-black text-xl text-ink mt-0.5">
          Correspondents matching “{q}”
        </h1>
        {data && (
          <p className="text-xs text-ink-faint mt-1 nums">
            {data.users.length} {data.users.length === 1 ? "entry" : "entries"}
          </p>
        )}
      </div>

      {isLoading && <LoadingSheets count={4} />}
      {data?.users.length === 0 && (
        <Empty title="No one of that name">Try a shorter search, or part of a handle.</Empty>
      )}
      {data?.users.map((u) => <UserRow key={u.id} user={u} />)}
    </div>
  );
}
