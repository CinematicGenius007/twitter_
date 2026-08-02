import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    handle: v.string(), // lowercase-normalized at write time
    displayName: v.string(),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    headerUrl: v.optional(v.string()),
    pinnedTweetId: v.optional(v.id("tweets")),
    createdAt: v.string(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_handle", ["handle"]),

  follows: defineTable({
    followerId: v.id("users"),
    followeeId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_follower", ["followerId"])
    .index("by_followee", ["followeeId"])
    .index("by_follower_followee", ["followerId", "followeeId"]),

  tweets: defineTable({
    authorId: v.id("users"),
    body: v.optional(v.string()),
    parentTweetId: v.optional(v.id("tweets")),
    quotedTweetId: v.optional(v.id("tweets")),
    createdAt: v.string(),
    editedAt: v.optional(v.string()),
    likesCount: v.number(),
    retweetsCount: v.number(),
    repliesCount: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_parent", ["parentTweetId"])
    .index("by_quoted", ["quotedTweetId"])
    .index("by_created", ["createdAt"])
    .index("by_parent_created", ["parentTweetId", "createdAt"]),

  tweetMedia: defineTable({
    tweetId: v.id("tweets"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("gif"), v.literal("video")),
    position: v.number(),
  }).index("by_tweet", ["tweetId"]),

  likes: defineTable({
    tweetId: v.id("tweets"),
    userId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_tweet_user", ["tweetId", "userId"])
    .index("by_user", ["userId"]),

  retweets: defineTable({
    tweetId: v.id("tweets"),
    userId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_tweet_user", ["tweetId", "userId"])
    .index("by_user", ["userId"]),

  // Always private — never joined/exposed for any user other than the
  // requesting owner, in any query. Every bookmarks function must derive
  // userId from ctx.auth.getUserIdentity(), never accept it as an arg.
  bookmarks: defineTable({
    tweetId: v.id("tweets"),
    userId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_tweet_user", ["tweetId", "userId"])
    .index("by_user", ["userId"]),

  // Reserved for a future notifications feature (deferred, not built yet).
  mentions: defineTable({
    tweetId: v.id("tweets"),
    mentionedUserId: v.id("users"),
  })
    .index("by_tweet", ["tweetId"])
    .index("by_mentionedUser", ["mentionedUserId"]),

  hashtags: defineTable({
    tag: v.string(), // normalized lowercase, no '#'
  }).index("by_tag", ["tag"]),

  tweetHashtags: defineTable({
    tweetId: v.id("tweets"),
    hashtagId: v.id("hashtags"),
  })
    .index("by_tweet", ["tweetId"])
    .index("by_hashtag", ["hashtagId"]),
});
