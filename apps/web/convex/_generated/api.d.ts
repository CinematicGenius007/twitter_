/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookmarks from "../bookmarks.js";
import type * as feed from "../feed.js";
import type * as follows from "../follows.js";
import type * as hashtags from "../hashtags.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_parse from "../lib/parse.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_serialize from "../lib/serialize.js";
import type * as lib_tweetMeta from "../lib/tweetMeta.js";
import type * as media from "../media.js";
import type * as tweets from "../tweets.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bookmarks: typeof bookmarks;
  feed: typeof feed;
  follows: typeof follows;
  hashtags: typeof hashtags;
  "lib/auth": typeof lib_auth;
  "lib/counters": typeof lib_counters;
  "lib/parse": typeof lib_parse;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/serialize": typeof lib_serialize;
  "lib/tweetMeta": typeof lib_tweetMeta;
  media: typeof media;
  tweets: typeof tweets;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
