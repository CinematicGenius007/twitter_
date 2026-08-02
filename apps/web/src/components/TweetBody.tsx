import { Link } from "react-router";

const TOKEN_RE = /(@[a-zA-Z0-9_]{1,15}|#[a-zA-Z0-9_]+)/g;

/* References are set in indigo — a second ink on the desk. Keeping links a
   different colour from the red used for actions means a link is never
   mistaken for a button, which is the whole point of having two accents. */
const refClass =
  "text-indigo decoration-indigo/35 underline underline-offset-[3px] hover:decoration-indigo transition-colors";

export function TweetBody({ body }: { body: string | null }) {
  if (!body) return null;
  const parts = body.split(TOKEN_RE);

  return (
    <p className="font-body whitespace-pre-wrap break-words leading-relaxed text-ink">
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_]{1,15}$/.test(part)) {
          return (
            <Link key={i} to={`/${part.slice(1)}`} className={refClass} onClick={(e) => e.stopPropagation()}>
              {part}
            </Link>
          );
        }
        if (/^#[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <Link
              key={i}
              to={`/hashtag/${part.slice(1).toLowerCase()}`}
              className={refClass}
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
