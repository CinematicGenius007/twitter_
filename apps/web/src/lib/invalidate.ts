import type { QueryClient } from "@tanstack/react-query";

/** Every mutation (post/edit/delete/like/retweet/bookmark/follow) can touch a
 *  tweet or count that's cached under several different query keys at once
 *  (feed, thread, profile, hashtag, search...). At this app's scale a full
 *  invalidation is simpler and cheap enough — not worth hand-tracking which
 *  keys a given action actually touches. */
export function invalidateAll(queryClient: QueryClient): void {
  void queryClient.invalidateQueries();
}
