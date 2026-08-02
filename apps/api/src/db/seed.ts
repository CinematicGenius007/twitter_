// Dev seed data. Run via `bun run db:seed` (root: `bun run db:seed`).
// Generates ~50 users, ~1000 tweets spread randomly over ~2 years, plus
// follows/likes/retweets/bookmarks/replies/quote-tweets/hashtags/mentions
// so every feature in docs/ARCHITECTURE.md has something to look at.
// All seed users share one password: "password123" (fine — local dev only,
// see apps/api/.env, this file is never run against anything but a local db).

import { db } from "./client";
import { hashPassword } from "../lib/password";
import { syncMentionsAndHashtags } from "../lib/tweets";

const USER_COUNT = 50;
const ORIGINAL_TWEET_COUNT = 700;
const REPLY_COUNT = 200;
const QUOTE_COUNT = 100; // totals 1000

const SEED_PASSWORD = "password123";

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Priya", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara",
  "Myra", "Anika", "Riya", "Isha", "Rohan", "Karan", "Neha", "Pooja", "Rahul",
  "Aman", "Simran", "Tara", "Dev", "Meera", "Kabir", "Naveen", "Sneha",
  "Varun", "Nikhil", "Divya", "Yash", "Ritika", "Aryan", "Zoya",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Patel", "Kumar", "Reddy", "Rao",
  "Nair", "Iyer", "Das", "Mehta", "Joshi", "Chopra", "Malhotra", "Kapoor",
  "Bose", "Menon", "Pillai", "Shah",
];

const BIOS = [
  "2nd year CS student. Coffee-powered.",
  "Trying to survive semester exams one bug at a time.",
  "Hostel room 214. Send memes.",
  "Aspiring backend developer. Currently debugging life.",
  "Cricket, chai, and compilers.",
  "Library regular. Occasional overachiever.",
  "Just here for the group projects drama.",
  "Full-time student, part-time procrastinator.",
  "CSE '27. Building things that mostly work.",
  "Night owl. Deadline sprinter.",
  "",
  "Music, movies, and midterms.",
  "Debate club president. Argues about everything.",
  "Learning React one error at a time.",
  "Hostel wifi survivor.",
];

const LOCATIONS = [
  "Delhi, India", "Mumbai, India", "Bengaluru, India", "Pune, India",
  "Hyderabad, India", "Chennai, India", "Kolkata, India", "Jaipur, India",
  "Lucknow, India", "Ahmedabad, India", null, null, null,
];

const HASHTAG_POOL = [
  "college", "exams", "coding", "chai", "cricket", "weekend", "ai", "food",
  "music", "travel", "bugfix", "midnight", "library", "hostel", "cs101",
  "deadline", "hackathon", "memes", "placement", "internship", "opensource",
  "javascript", "python", "react", "sql",
];

const TWEET_BODIES = [
  "Just spent three hours debugging only to find a missing semicolon.",
  "The library wifi has chosen violence today.",
  "Mess food was actually decent today, screenshot this for proof.",
  "Why does every assignment deadline land on the same day.",
  "Pulled an all-nighter for an exam that had two questions from the syllabus.",
  "Group project update: I am doing everything, as expected.",
  "Finally understood recursion. Send help, I understand recursion.",
  "Professor just said 'this won't be on the exam' three times. It was on the exam.",
  "Hostel room smells like instant noodles and regret.",
  "Started learning a new framework at 1am, incredible decision making.",
  "Cricket match in the hostel ground got cancelled because of the sprinklers.",
  "My code worked on the first try and now I'm suspicious.",
  "Attendance is at exactly 75%. Living dangerously.",
  "Chai break turned into a two hour conversation about placements.",
  "Rewriting my resume for the fourth time this month.",
  "The canteen queue is longer than the assignment I haven't started.",
  "Every semester I say I'll start early. Every semester I don't.",
  "Found a bug that only happens on Tuesdays, still investigating.",
  "Midterm results are out and I have chosen to not look.",
  "Someone's playing music in the hostel corridor at 2am again.",
  "Spent the whole lecture debugging on my laptop instead of listening.",
  "The wifi router in block C has become a mythical creature.",
  "Just realized the assignment due tomorrow was actually due today.",
  "Coffee machine in the CS lab is down again, this is a crisis.",
  "Studying for the exam by reading everyone else's notes instead of mine.",
  "Got selected for the hackathon team, now the actual work begins.",
  "The professor uploaded slides titled 'final_final_v2_USE_THIS'.",
  "Three back to back lectures and my brain has left the building.",
  "Finally fixed the merge conflict that ruined my entire evening.",
  "Library closes in ten minutes and I just opened my notes.",
  "Someone in my batch understood the lecture, it was not me.",
  "The vending machine ate my money again, personal vendetta confirmed.",
  "Turns out the bug was in my test, not my actual code.",
  "Skipped breakfast, skipped lunch, still awake coding this project.",
  "Placement season nerves are hitting different this year.",
  "Rewrote the same function five times before it finally clicked.",
  "The hostel warden's new rule list is longer than my thesis.",
  "Every group chat right now is just deadline panic messages.",
  "Finally got my dev environment working after four hours of setup.",
  "The exam hall was colder than my chances of passing this paper.",
  "Watched a fifteen minute tutorial to fix a one line bug.",
  "Our team's hackathon idea sounded great until we tried building it.",
  "Reading week is a myth, it's just exam week in disguise.",
  "The professor's handwriting on the board should be a cipher challenge.",
  "Just discovered a keyboard shortcut that would've saved me a week.",
  "Campus fest planning meeting somehow lasted longer than the fest itself.",
  "My code review just came back with more comments than code.",
  "Studying with friends means studying for ten minutes and talking for two hours.",
  "The internship application portal crashed an hour before the deadline.",
  "Finally beat that one level of the assignment that made no sense.",
  "Someone brought a projector to the hostel common room, movie night is on.",
  "The canteen introduced a new dish and it's somehow already a legend.",
  "Spent the afternoon arguing about tabs versus spaces, no regrets.",
  "The elective I picked for an easy grade turned out to be the hardest one.",
  "Woke up to seventeen unread messages from the group project chat.",
  "Explaining my code to the TA made me realize I don't understand it either.",
  "The library reserved a whole floor for finals week, it's a warzone in there.",
  "Accidentally pushed to the wrong branch, deep breaths, we recover.",
  "The seniors' placement stories are equal parts inspiring and terrifying.",
  "Found out the assignment extension was announced an hour after I finished it.",
];

const REPLY_BODIES = [
  "this is so relatable",
  "lmao same",
  "wait what",
  "source?",
  "based",
  "fair point tbh",
  "I felt this in my soul",
  "why is this so real",
  "literally me rn",
  "can confirm",
  "no because this is too accurate",
  "sending this to the group chat",
  "this but unironically",
  "the accuracy is unmatched",
  "same energy",
  "why do I relate to this so much",
  "this aged well",
  "calling my roommate rn",
  "screenshotting this",
  "the audacity",
  "not me reading this during class",
  "loool",
  "true true",
  "big if true",
  "this you?",
  "we are not the same",
  "explain now",
  "this is a callout post",
  "felt this one",
  "not this again",
];

const QUOTE_COMMENTS = [
  "this needs more attention",
  "important",
  "watch this thread",
  "not gonna lie, accurate",
  "the real MVP take",
  "case closed",
  "this is the tweet",
  "co-signing this",
  "underrated take",
  "everyone needs to see this",
  "the discourse we needed",
  "filing this under facts",
  "no notes",
  "this aged like fine wine",
  "", "", "", // empty quote comment is valid — see docs/ARCHITECTURE.md §1
];

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
const now = Date.now();

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function sample<T>(arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(randInt(0, pool.length - 1), 1)[0]!);
  }
  return out;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function randomPastTimestamp(): string {
  return new Date(now - randInt(0, TWO_YEARS_MS)).toISOString();
}

/** timestamp strictly after `after`, at most 14 days later, never in the future */
function timestampAfter(after: string): string {
  const base = new Date(after).getTime();
  const t = Math.min(now, base + randInt(60_000, 14 * 24 * 60 * 60 * 1000));
  return new Date(t).toISOString();
}

function withExtras(base: string, handles: string[], selfHandle: string): string {
  let body = base;
  if (chance(0.35)) {
    const tags = sample(HASHTAG_POOL, randInt(1, 2));
    body += " " + tags.map((t) => `#${t}`).join(" ");
  }
  if (chance(0.15)) {
    const others = handles.filter((h) => h !== selfHandle);
    if (others.length > 0) body += ` @${choice(others)}`;
  }
  return body.slice(0, 280);
}

interface SeedUser {
  id: number;
  handle: string;
}

interface SeedTweet {
  id: number;
  author_id: number;
  created_at: string;
}

const existingCount = db.query("SELECT COUNT(*) as n FROM users").get() as { n: number };
if (existingCount.n > 0) {
  console.log("Users already exist, skipping seed. Delete apps/api/data/ and re-run db:init to reseed.");
  process.exit(0);
}

// bun:sqlite transaction bodies must be synchronous, so the (async) password
// hash is resolved up front and closed over below, not computed inside seedTx.
const passwordHash = await hashPassword(SEED_PASSWORD);

const seedTx = db.transaction(() => {
  // --- users ---
  const insertUser = db.query(
    `INSERT INTO users (handle, display_name, bio, location, website, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id, handle`,
  );

  const takenHandles = new Set<string>();
  const users: SeedUser[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const first = choice(FIRST_NAMES);
    const last = choice(LAST_NAMES);
    let handle = (first + randInt(1, 999)).toLowerCase().slice(0, 15);
    while (takenHandles.has(handle)) {
      handle = (first + randInt(1, 9999)).toLowerCase().slice(0, 15);
    }
    takenHandles.add(handle);

    const bio = choice(BIOS) || null;
    const location = choice(LOCATIONS);
    const website = chance(0.25) ? `https://${handle}.dev` : null;
    const createdAt = randomPastTimestamp();

    const row = insertUser.get(
      handle,
      `${first} ${last}`,
      bio,
      location,
      website,
      passwordHash,
      createdAt,
    ) as SeedUser;
    users.push(row);
  }

  const handles = users.map((u) => u.handle);
  // ~15% never author a tweet — the brief explicitly wants some zero-tweet users
  const lurkers = new Set(sample(users, Math.round(USER_COUNT * 0.15)).map((u) => u.id));
  const authorPool = users.filter((u) => !lurkers.has(u.id));

  // --- original tweets ---
  const insertTweet = db.query(
    `INSERT INTO tweets (author_id, body, parent_tweet_id, quoted_tweet_id, created_at)
     VALUES (?, ?, ?, ?, ?) RETURNING id, author_id, created_at`,
  );

  const allTweets: SeedTweet[] = [];

  for (let i = 0; i < ORIGINAL_TWEET_COUNT; i++) {
    const author = choice(authorPool);
    const body = withExtras(choice(TWEET_BODIES), handles, author.handle);
    const createdAt = randomPastTimestamp();
    const row = insertTweet.get(author.id, body, null, null, createdAt) as SeedTweet;
    syncMentionsAndHashtags(row.id, body);
    allTweets.push(row);
  }

  // --- replies (can target any existing tweet, including other replies —
  // this is what gives threads arbitrary depth, see docs/ARCHITECTURE.md §1) ---
  for (let i = 0; i < REPLY_COUNT; i++) {
    const parent = choice(allTweets);
    const author = choice(authorPool);
    const base = chance(0.5) ? choice(REPLY_BODIES) : choice(TWEET_BODIES);
    const body = withExtras(base, handles, author.handle);
    const createdAt = timestampAfter(parent.created_at);
    const row = insertTweet.get(author.id, body, parent.id, null, createdAt) as SeedTweet;
    syncMentionsAndHashtags(row.id, body);
    allTweets.push(row);
  }

  // --- quote-tweets ---
  for (let i = 0; i < QUOTE_COUNT; i++) {
    const quoted = choice(allTweets);
    const author = choice(authorPool);
    const base = choice(QUOTE_COMMENTS);
    const body = base ? withExtras(base, handles, author.handle) : "";
    const createdAt = timestampAfter(quoted.created_at);
    const row = insertTweet.get(author.id, body || null, null, quoted.id, createdAt) as SeedTweet;
    if (body) syncMentionsAndHashtags(row.id, body);
    allTweets.push(row);
  }

  // --- follows: each user follows a random 3-15 others ---
  const insertFollow = db.query(
    "INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)",
  );
  for (const user of users) {
    const others = users.filter((u) => u.id !== user.id);
    for (const followee of sample(others, randInt(3, 15))) {
      insertFollow.run(user.id, followee.id);
    }
  }

  // --- likes / retweets / bookmarks: independent random pass over every
  // (tweet, user) pair. Trivial cost at this scale, gives an organic-looking
  // count distribution instead of a flat one. ---
  const insertLike = db.query("INSERT OR IGNORE INTO likes (tweet_id, user_id) VALUES (?, ?)");
  const insertRetweet = db.query("INSERT OR IGNORE INTO retweets (tweet_id, user_id) VALUES (?, ?)");
  const insertBookmark = db.query("INSERT OR IGNORE INTO bookmarks (tweet_id, user_id) VALUES (?, ?)");

  for (const tweet of allTweets) {
    for (const user of users) {
      if (user.id === tweet.author_id) continue;
      if (chance(0.05)) insertLike.run(tweet.id, user.id);
      if (chance(0.02)) insertRetweet.run(tweet.id, user.id);
      if (chance(0.015)) insertBookmark.run(tweet.id, user.id);
    }
  }

  // --- pin a tweet for ~30% of users who authored at least one ---
  const pinTweet = db.query("UPDATE users SET pinned_tweet_id = ? WHERE id = ?");
  const tweetsByAuthor = new Map<number, number[]>();
  for (const t of allTweets) {
    if (!tweetsByAuthor.has(t.author_id)) tweetsByAuthor.set(t.author_id, []);
    tweetsByAuthor.get(t.author_id)!.push(t.id);
  }
  for (const [authorId, tweetIds] of tweetsByAuthor) {
    if (chance(0.3)) pinTweet.run(choice(tweetIds), authorId);
  }

  return { userCount: users.length, tweetCount: allTweets.length };
});

console.log("Seeding — this can take a few seconds...");
const result = seedTx();
console.log(`Seeded ${result.userCount} users and ${result.tweetCount} tweets.`);
console.log(`All seed users share the password: ${SEED_PASSWORD}`);
