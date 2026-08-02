import { mutation } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";

// The generated URL itself accepts any upload up to Convex's own size cap —
// the real MIME/size security boundary is enforced server-side wherever the
// resulting storageId is attached (tweets.create, users.updateProfile),
// via ctx.storage.getMetadata().
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    await rateLimiter.limit(ctx, "mediaUpload", { key: user._id, throws: true });
    return await ctx.storage.generateUploadUrl();
  },
});
