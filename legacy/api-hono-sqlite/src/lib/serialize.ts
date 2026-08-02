export interface UserRow {
  id: number;
  handle: string;
  display_name: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
  header_url: string | null;
  pinned_tweet_id: number | null;
  password_hash: string;
  created_at: string;
}

export type PublicUser = Omit<UserRow, "password_hash">;

export function serializeUser(row: UserRow): PublicUser {
  const { password_hash: _password_hash, ...rest } = row;
  return rest;
}
