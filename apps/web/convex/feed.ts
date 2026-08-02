import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { getCurrentUser, requireCurrentUser } from "./lib/auth";
import { serializeTweet } from "./lib/serialize";
import type { Doc, Id } from "./_generated/dataModel";

// Global timeline: top-level tweets (no replies), newest first.
export const publicFeed = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const viewer = await getCurrentUser(ctx);
    const result = await ctx.db
      .query("tweets")
      .withIndex("by_parent_created", (q) => q.eq("parentTweetId", undefined))
      .order("desc")
      .paginate(paginationOpts);
    const page = await Promise.all(result.page.map((t) => serializeTweet(ctx, t, viewer?._id ?? null)));
    return { ...result, page };
  },
});

interface FeedItem {
  tweet: Doc<"tweets">;
  effectiveCreatedAt: string;
  retweetedByHandle: string | null;
}

// Following timeline: your own tweets + tweets from people you follow,
// interleaved with retweets from those same people (ordered by the
// retweet's own createdAt, not the original tweet's).
export const followingFeed = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const viewer = await requireCurrentUser(ctx);

    const followRows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", viewer._id))
      .collect();
    const authorIds: Id<"users">[] = [viewer._id, ...followRows.map((f) => f.followeeId)];

    const authoredRows = (
      await Promise.all(
        authorIds.map((uid) =>
          ctx.db
            .query("tweets")
            .withIndex("by_author", (q) => q.eq("authorId", uid))
            .collect(),
        ),
      )
    )
      .flat()
      .filter((t) => t.parentTweetId === undefined);

    const retweetRows = (
      await Promise.all(
        authorIds.map((uid) =>
          ctx.db
            .query("retweets")
            .withIndex("by_user", (q) => q.eq("userId", uid))
            .collect(),
        ),
      )
    ).flat();

    const retweetItems: FeedItem[] = (
      await Promise.all(
        retweetRows.map(async (r) => {
          const tweet = await ctx.db.get(r.tweetId);
          if (!tweet) return null;
          const retweeter = await ctx.db.get(r.userId);
          return { tweet, effectiveCreatedAt: r.createdAt, retweetedByHandle: retweeter?.handle ?? null };
        }),
      )
    ).filter((x): x is FeedItem => x != null);

    const authoredItems: FeedItem[] = authoredRows.map((t) => ({
      tweet: t,
      effectiveCreatedAt: t.createdAt,
      retweetedByHandle: null,
    }));

    const merged = [...authoredItems, ...retweetItems].sort((a, b) =>
      a.effectiveCreatedAt < b.effectiveCreatedAt ? 1 : -1,
    );

    // Merged/sorted in-memory set, not a single indexed range — manual
    // offset-based pagination instead of Convex's native paginate() cursor.
    // Fine at this project's scale.
    const cursor = paginationOpts.cursor ? Number(paginationOpts.cursor) : 0;
    const pageSize = paginationOpts.numItems;
    const pageItems = merged.slice(cursor, cursor + pageSize);
    const nextCursor = cursor + pageSize;

    const page = await Promise.all(
      pageItems.map(async (item) => ({
        ...(await serializeTweet(ctx, item.tweet, viewer._id)),
        retweetedByHandle: item.retweetedByHandle,
      })),
    );

    return {
      page,
      isDone: nextCursor >= merged.length,
      continueCursor: String(nextCursor),
    };
  },
});
