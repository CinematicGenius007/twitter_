import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { Profile, Tweet, User } from "./types";

// limit=50 (the API's max) and no "load more" UI — pagination beyond the
// first page is a known simplification, fine at this app's scale.
export function useFeed(tab: "public" | "following") {
  return useQuery({
    queryKey: ["feed", tab],
    queryFn: () => api.get<{ tweets: Tweet[] }>(`/feed/${tab}?limit=50`),
  });
}

export function useTweetThread(id: number) {
  return useQuery({
    queryKey: ["tweet", id],
    queryFn: () => api.get<{ tweet: Tweet; parents: Tweet[]; replies: Tweet[] }>(`/tweets/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useProfile(handle: string) {
  return useQuery({
    queryKey: ["profile", handle],
    queryFn: () => api.get<{ user: Profile }>(`/users/${handle}`),
    enabled: !!handle,
  });
}

export function useUserTweets(handle: string) {
  return useQuery({
    queryKey: ["userTweets", handle],
    queryFn: () => api.get<{ tweets: Tweet[] }>(`/users/${handle}/tweets`),
    enabled: !!handle,
  });
}

export function useUserLikes(handle: string) {
  return useQuery({
    queryKey: ["userLikes", handle],
    queryFn: () => api.get<{ tweets: Tweet[] }>(`/users/${handle}/likes`),
    enabled: !!handle,
  });
}

export function useMyBookmarks(enabled: boolean) {
  return useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => api.get<{ tweets: Tweet[] }>(`/users/me/bookmarks`),
    enabled,
  });
}

export function useFollowList(handle: string, kind: "followers" | "following") {
  return useQuery({
    queryKey: ["followList", handle, kind],
    queryFn: () => api.get<{ users: User[] }>(`/users/${handle}/${kind}`),
    enabled: !!handle,
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => api.get<{ users: User[] }>(`/users/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });
}

export function useHashtag(tag: string) {
  return useQuery({
    queryKey: ["hashtag", tag],
    queryFn: () => api.get<{ tag: string; tweets: Tweet[] }>(`/hashtags/${encodeURIComponent(tag)}`),
    enabled: !!tag,
  });
}
