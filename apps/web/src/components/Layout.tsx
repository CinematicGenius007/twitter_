import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { MagnifyingGlass, SignOut, BookmarkSimple, Newspaper } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { Avatar } from "./Avatar";
import { TornEdge, Watermark, InkUnderline } from "./Ornament";
import { Button } from "./Button";

/** A real newspaper flag: double rule, wordmark, and a dateline carrying
 *  actual information. "Price One Penny" is the paper's own name doing work. */
function Masthead() {
  const now = new Date();
  const issue = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const date = now
    .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <div className="pt-8 pb-4 text-center">
      <Link to="/" className="block group">
        <div className="border-t-2 border-b border-ink mb-4" />
        <h1 className="font-wordmark text-3xl sm:text-[3.4rem] leading-[0.95] text-ink group-hover:text-seal transition-colors pressed">
          Penny Post
        </h1>
        <div className="border-t border-b-2 border-ink mt-3" />
      </Link>
      <div className="flex items-center justify-between gap-2 mt-2 label text-2xs text-ink-soft">
        <span className="hidden sm:inline">Vol. I — No. {issue}</span>
        <span className="flex-1 text-center tracking-[0.16em]">{date}</span>
        <span className="hidden sm:inline">Price One Penny</span>
      </div>
    </div>
  );
}

function NavItem({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative label text-2xs px-1 py-2 whitespace-nowrap transition-colors ${
          isActive ? "text-ink" : "text-ink-soft hover:text-seal"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}
          {isActive && <InkUnderline />}
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout, signedIn, onboarded, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!loading && signedIn && !onboarded && location.pathname !== "/complete-profile") {
      navigate("/complete-profile", { replace: true });
    }
  }, [loading, signedIn, onboarded, location.pathname, navigate]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="min-h-svh flex flex-col">
      <Watermark />

      <div className="w-full max-w-[680px] mx-auto px-4 flex-1 relative">
        <Masthead />

        {/* Nav sticks; the flag above is allowed to scroll away. Keeps the
            identity on first paint without eating the viewport afterwards. */}
        <nav className="sticky top-0 z-20 -mx-4 px-4 bg-paper/95 backdrop-blur-[2px] border-b border-rule">
          <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5 py-1.5">
            <NavItem to="/" end>
              <span className="flex items-center gap-1.5">
                <Newspaper size={14} weight="light" /> The Wire
              </span>
            </NavItem>
            {user && (
              <NavItem to={`/${user.handle}`}>
                <span className="flex items-center gap-1.5">
                  <BookmarkSimple size={14} weight="light" /> My Desk
                </span>
              </NavItem>
            )}

            {/* full width on its own row when cramped, inline once there's room */}
            <form
              onSubmit={handleSearch}
              className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:ml-auto sm:max-w-[180px] pb-1 sm:pb-0"
            >
              <MagnifyingGlass
                size={13}
                weight="light"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find a correspondent"
                aria-label="Search correspondents"
                className="w-full bg-paper-bright border border-rule pl-7 pr-2 py-1.5 text-2xs font-body outline-none focus:border-seal transition-colors placeholder:text-ink-faint"
              />
            </form>

            {user ? (
              <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                <Link to={`/${user.handle}`} title={`@${user.handle}`} className="hover:scale-105 transition-transform">
                  <Avatar handle={user.handle} displayName={user.display_name} avatarUrl={user.avatar_url} size={26} />
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  title="Sign off"
                  aria-label="Sign off"
                  className="text-ink-faint hover:text-seal transition-colors p-1"
                >
                  <SignOut size={15} weight="light" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/login" className="label text-2xs text-ink-soft hover:text-seal">
                  Sign in
                </Link>
                <Button size="sm" variant="primary" onClick={() => navigate("/register")}>
                  Join
                </Button>
              </div>
            )}
          </div>
        </nav>

        <main className="pb-20 pt-2">
          <Outlet />
        </main>
      </div>

      {/* The dark band. Without a genuinely dark ground somewhere, the whole
          page floats as undifferentiated beige — this is what anchors it. */}
      <footer className="relative mt-auto">
        <TornEdge color="var(--paper)" className="absolute -top-px left-0 right-0 z-10" />
        <div className="bg-dark text-dark-text pt-12 pb-10 px-4">
          <div className="max-w-[680px] mx-auto text-center">
            <p className="font-wordmark text-2xl text-paper-aged leading-none">Penny Post</p>
            <div className="my-4 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-dark-text/30" />
              <span className="label text-2xs tracking-[0.2em] text-dark-text/70">Colophon</span>
              <span className="h-px w-12 bg-dark-text/30" />
            </div>
            <p className="text-2xs leading-relaxed text-dark-text/65 max-w-md mx-auto">
              Set in Pinyon Script, Playfair Display &amp; Courier Prime. Composed and printed
              locally on SQLite. Every dispatch herein is fictitious.
            </p>
            <p className="label text-2xs tracking-[0.18em] text-dark-text/40 mt-5">
              No. 1 of 1 — Printed for the Proprietor
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
