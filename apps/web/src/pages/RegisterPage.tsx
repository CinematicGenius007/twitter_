import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { SignUp } from "@clerk/clerk-react";
import { Fleuron } from "../components/Ornament";
import { clerkAppearance } from "../lib/clerkAppearance";

/*
  Sign-up is invitation-only (see convex/invites.ts).

  Clerk appends `__clerk_ticket` when someone follows an invitation link —
  that ticket is what its <SignUp/> consumes to create the account with the
  invited address already verified. Without one there is nothing useful to
  show, so the page explains the rule rather than presenting a form that
  Clerk's restricted sign-up mode would refuse anyway.
*/

export function RegisterPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const hasTicket = !!params.get("__clerk_ticket");

  // Clerk's multi-step flow navigates to /register/verify-email-address etc.
  // and drops the query string on the way, so the ticket has to be sticky —
  // otherwise the refusal panel would ambush someone mid-sign-up.
  const [ticketSeen, setTicketSeen] = useState(hasTicket);
  useEffect(() => {
    if (hasTicket) setTicketSeen(true);
  }, [hasTicket]);
  const inClerkFlow = location.pathname.replace(/\/$/, "") !== "/register";

  if (!hasTicket && !ticketSeen && !inClerkFlow) {
    return (
      <div className="max-w-sm mx-auto py-8">
        <div className="text-center mb-6">
          <h1 className="font-display font-black text-xl text-ink">Subscriptions by Introduction</h1>
          <p className="text-xs text-ink-soft mt-1.5">Penny Post takes no subscriptions off the street.</p>
          <Fleuron className="max-w-[140px] mx-auto mt-3" />
        </div>

        <div className="sheet p-6 text-center">
          <p className="text-sm text-ink leading-relaxed">
            A new correspondent is admitted only on the introduction of an existing one. Ask a subscriber for a letter;
            it will arrive by email, addressed to you alone.
          </p>
          <div className="my-5 h-px bg-rule" />
          <p className="text-xs text-ink-soft">
            Holding a letter already? Open the link inside it — that link, and only that link, opens the subscription
            book.
          </p>
        </div>

        <p className="text-2xs text-ink-faint text-center mt-4">
          Already a subscriber?{" "}
          <Link to="/login" className="text-seal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Take Out a Subscription</h1>
        <p className="text-xs text-ink-soft mt-1.5">Your letter is in order. Price one penny, payable never.</p>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/complete-profile"
        appearance={clerkAppearance}
      />
    </div>
  );
}
