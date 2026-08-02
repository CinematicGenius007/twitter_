const MENTION_RE = /(?:^|[^\w])@([a-zA-Z0-9_]{1,15})/g;
const HASHTAG_RE = /(?:^|[^\w])#([a-zA-Z0-9_]+)/g;

/** Handles referenced via @handle in a tweet body, deduped, in first-seen order. */
export function extractMentions(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) seen.add(match[1]!);
  return [...seen];
}

/** Hashtags referenced via #tag in a tweet body, lowercased + deduped. */
export function extractHashtags(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(HASHTAG_RE)) seen.add(match[1]!.toLowerCase());
  return [...seen];
}
