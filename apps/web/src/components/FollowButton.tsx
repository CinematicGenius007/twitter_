import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { invalidateAll } from "../lib/invalidate";
import { useAuth } from "../lib/auth";

export function FollowButton({ handle, initialFollowing }: { handle: string; initialFollowing: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toggleFollow = useMutation(api.follows.toggle);
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!user || user.handle === handle) return null;

  async function handleClick() {
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      await toggleFollow({ handle, follow: next });
      invalidateAll(queryClient);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`border px-4 py-1 text-sm uppercase tracking-wide transition-colors ${
        following ? "border-rule text-ink-faded hover:border-accent hover:text-accent" : "border-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
