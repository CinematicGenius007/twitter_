import { Link } from "react-router";
import type { User } from "../lib/types";
import { Avatar } from "./Avatar";

/** One correspondent in a list — search results, readers, reading. */
export function UserRow({ user }: { user: User }) {
  return (
    <Link
      to={`/${user.handle}`}
      className="flex items-start gap-3.5 px-4 py-3.5 border-t border-dashed border-rule hover:bg-paper-bright/60 transition-colors"
    >
      <Avatar handle={user.handle} displayName={user.display_name} avatarUrl={user.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-ink truncate">{user.display_name}</p>
        <p className="text-xs text-ink-faint truncate">@{user.handle}</p>
        {user.bio && <p className="text-sm text-ink-soft mt-1 line-clamp-2">{user.bio}</p>}
      </div>
    </Link>
  );
}
