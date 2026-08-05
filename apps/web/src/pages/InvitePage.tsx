import { Link, useParams } from "react-router";
import { SealCheck } from "@phosphor-icons/react";
import { useInvite } from "../lib/queries";
import { useAuth } from "../lib/auth";
import { Button } from "../components/Button";
import { Empty, LoadingSheets } from "../components/States";
import { Fleuron, Postmark } from "../components/Ornament";

/*
  The public face of an invitation: `/invitation/:code`.

  Deliberately says little — the masked address is enough for the recipient to
  recognise which inbox was invited, and nothing here identifies them to a
  stranger. Accepting hands off to Clerk's ticket URL, which creates the
  account with that address already verified.
*/

const REFUSALS: Record<string, { title: string; body: string }> = {
  unknown: {
    title: "No such invitation",
    body: "This letter isn't in the register. Check the link, or ask whoever sent it to write again.",
  },
  accepted: {
    title: "Already taken up",
    body: "This invitation has been spent — the correspondent it named is already in print.",
  },
  revoked: {
    title: "Withdrawn",
    body: "The subscriber who wrote this letter has since withdrawn it.",
  },
  expired: {
    title: "Lapsed",
    body: "Invitations keep for a month. This one has passed its date — ask for a fresh letter.",
  },
};

export function InvitePage() {
  const { code = "" } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError } = useInvite(code);

  if (isLoading) return <LoadingSheets count={1} />;
  if (isError || !data) return <Empty title="No such invitation">Check the link and try again.</Empty>;

  if (data.status !== "pending") {
    const refusal = REFUSALS[data.status] ?? REFUSALS.unknown;
    return (
      <Empty title={refusal.title}>
        {refusal.body}{" "}
        <Link to="/" className="text-seal underline">
          Read the paper
        </Link>{" "}
        in the meantime.
      </Empty>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <p className="label text-2xs text-ink-soft tracking-[0.2em]">By introduction</p>
        <h1 className="font-display font-black text-xl text-ink mt-1.5">You Are Invited to Subscribe</h1>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>

      <div className="sheet p-6 text-center">
        <div className="flex justify-center mb-4">
          <Postmark label="Invited" sub={new Date(data.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
        </div>

        {data.inviterHandle && (
          <p className="text-sm text-ink">
            <span className="text-ink-soft">Introduced by </span>
            <Link to={`/${data.inviterHandle}`} className="text-seal hover:underline">
              {data.inviterName ?? `@${data.inviterHandle}`}
            </Link>
          </p>
        )}

        <p className="text-xs text-ink-soft mt-3">
          Addressed to <span className="font-body text-ink">{data.maskedEmail}</span>. The invitation binds to that
          address — sign up with it and no other.
        </p>

        <div className="my-5 h-px bg-rule" />

        {user ? (
          <p className="text-xs text-ink-soft">
            You are already signed in as{" "}
            <Link to={`/${user.handle}`} className="text-seal hover:underline">
              @{user.handle}
            </Link>
            . Pass this letter to the correspondent it names.
          </p>
        ) : data.ticketUrl ? (
          <>
            <Button variant="primary" size="lg" className="w-full" onClick={() => (window.location.href = data.ticketUrl!)}>
              <SealCheck size={15} weight="light" />
              Take out the subscription
            </Button>
            <p className="text-2xs text-ink-faint mt-3">Price one penny. Payable never.</p>
          </>
        ) : (
          <p className="text-xs text-ink-soft">
            The letter is valid, but its link hasn't finished posting. Check the invited inbox — the same invitation was
            emailed there.
          </p>
        )}
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
