import { useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { mapUser } from "./types";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signedIn: boolean;
  onboarded: boolean;
  logout: () => Promise<void>;
}

/** Merges Clerk's signed-in identity with the app-level Convex `users` row
 *  (handle, bio, etc — fields Clerk doesn't know about). `onboarded` is
 *  false when Clerk auth succeeded but no users.completeProfile row exists
 *  yet — callers use this to redirect to /complete-profile. */
export function useAuth(): AuthState {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const me = useConvexQuery(api.users.me, isSignedIn ? {} : "skip");

  const loading = !isLoaded || (!!isSignedIn && me === undefined);
  // Convex's useQuery keeps a stable `me` reference across renders when the
  // underlying data hasn't changed — memoizing on it keeps `user` stable
  // too, so effects keyed on `user` (e.g. EditProfilePage's field
  // initializer) don't refire and clobber in-progress edits every render.
  const user = useMemo(() => (me ? mapUser(me) : null), [me]);

  return {
    user,
    loading,
    signedIn: !!isSignedIn,
    onboarded: !isSignedIn || me !== null,
    logout: async () => {
      await signOut();
    },
  };
}
