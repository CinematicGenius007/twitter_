import { useQuery } from "@tanstack/react-query";
import { convexClient } from "./convexClient";
import { api } from "../../convex/_generated/api";
import { mapProfile, mapTweet } from "./mapConvex";
import type { Id } from "../../convex/_generated/dataModel";

// Fixed page of 50, no "load more" UI — matches the old API's max limit and
// known simplification. Convex's useQuery would double-subscribe alongside
// TanStack Query, so these call the one-shot convexClient.query/mutation
// instead of the reactive convex/react hooks.
const PAGE = { numItems: 50, cursor: null };

export function useFeed(tab: "public" | "following") {
  return useQuery({
    queryKey: ["feed", tab],
    queryFn: async () => {
      const fn = tab === "public" ? api.feed.publicFeed : api.feed.followingFeed;
      const result = await convexClient.query(fn, { paginationOpts: PAGE });
      return { tweets: result.page.map(mapTweet) };
    },
  });
}

export function useTweetThread(id: string) {
  return useQuery({
    queryKey: ["tweet", id],
    queryFn: async () => {
      const result = await convexClient.query(api.tweets.getWithThread, { tweetId: id as Id<"tweets"> });
      return { tweet: mapTweet(result.tweet), parents: result.parents.map(mapTweet), replies: result.replies.map(mapTweet) };
    },
    enabled: !!id,
  });
}

export function useProfile(handle: string) {
  return useQuery({
    queryKey: ["profile", handle],
    queryFn: async () => {
      const result = await convexClient.query(api.users.getProfile, { handle });
      return { user: mapProfile(result) };
    },
    enabled: !!handle,
  });
}

export function useUserTweets(handle: string) {
  return useQuery({
    queryKey: ["userTweets", handle],
    queryFn: async () => {
      const result = await convexClient.query(api.users.getTweets, { handle });
      return { tweets: result.map(mapTweet) };
    },
    enabled: !!handle,
  });
}

export function useUserLikes(handle: string) {
  return useQuery({
    queryKey: ["userLikes", handle],
    queryFn: async () => {
      const result = await convexClient.query(api.users.getLikes, { handle });
      return { tweets: result.map(mapTweet) };
    },
    enabled: !!handle,
  });
}

export function useMyBookmarks(enabled: boolean) {
  return useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const result = await convexClient.query(api.bookmarks.myBookmarks, {});
      return { tweets: result.map(mapTweet) };
    },
    enabled,
  });
}

export function useFollowList(handle: string, kind: "followers" | "following") {
  return useQuery({
    queryKey: ["followList", handle, kind],
    queryFn: async () => {
      const fn = kind === "followers" ? api.follows.getFollowers : api.follows.getFollowing;
      const result = await convexClient.query(fn, { handle });
      return {
        users: result.map((u) => ({
          id: u._id,
          handle: u.handle,
          display_name: u.displayName,
          bio: u.bio ?? null,
          location: u.location ?? null,
          website: u.website ?? null,
          avatar_url: u.avatarUrl ?? null,
          header_url: u.headerUrl ?? null,
          pinned_tweet_id: u.pinnedTweetId ?? null,
          created_at: u.createdAt,
        })),
      };
    },
    enabled: !!handle,
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      const result = await convexClient.query(api.users.search, { q });
      return {
        users: result.map((u) => ({
          id: u._id,
          handle: u.handle,
          display_name: u.displayName,
          bio: u.bio ?? null,
          location: u.location ?? null,
          website: u.website ?? null,
          avatar_url: u.avatarUrl ?? null,
          header_url: u.headerUrl ?? null,
          pinned_tweet_id: u.pinnedTweetId ?? null,
          created_at: u.createdAt,
        })),
      };
    },
    enabled: q.trim().length > 0,
  });
}

export function useHashtag(tag: string) {
  return useQuery({
    queryKey: ["hashtag", tag],
    queryFn: async () => {
      const result = await convexClient.query(api.hashtags.getByTag, { tag });
      return { tag: result.tag, tweets: result.tweets.map(mapTweet) };
    },
    enabled: !!tag,
  });
}
