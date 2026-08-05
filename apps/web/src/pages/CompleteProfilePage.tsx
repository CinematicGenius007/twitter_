import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { useClerk } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Button, Field, inputClass } from "../components/Button";
import { Fleuron } from "../components/Ornament";
import { LoadingSheets } from "../components/States";

export function CompleteProfilePage() {
  const completeProfile = useMutation(api.users.completeProfile);
  // The same gate `users.completeProfile` enforces, asked ahead of time so a
  // visitor without a letter gets an explanation rather than a form that will
  // reject them (convex/invites.ts myEligibility).
  const eligibility = useQuery(api.invites.myEligibility, {});
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await completeProfile({ handle: handle.trim(), displayName: displayName.trim() });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^.*Uncaught Error: /, "") : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (eligibility === undefined) return <LoadingSheets count={1} />;

  if (!eligibility.eligible) {
    const body =
      eligibility.reason === "no-verified-email"
        ? "Penny Post needs a verified email address on your account before it can match you to a letter of introduction."
        : "Penny Post admits new correspondents only on the introduction of an existing subscriber, and this address has no letter outstanding.";
    return (
      <div className="max-w-sm mx-auto py-8">
        <div className="text-center mb-6">
          <h1 className="font-display font-black text-xl text-ink">Not on the List</h1>
          <Fleuron className="max-w-[140px] mx-auto mt-3" />
        </div>
        <div className="sheet p-6 text-center">
          <p className="text-sm text-ink leading-relaxed">{body}</p>
          {eligibility.email && (
            <p className="text-2xs text-ink-faint mt-3">Signed in as {eligibility.email}</p>
          )}
          <div className="my-5 h-px bg-rule" />
          <p className="text-xs text-ink-soft">
            If a letter was sent to a different address, sign off and come back through that one.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => void signOut()}>
            Sign off
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Claim Your Byline</h1>
        <p className="text-xs text-ink-soft mt-1.5">One more line, then the presses roll.</p>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="sheet p-6 flex flex-col gap-4">
        <Field label="Handle" hint="Letters, numbers and underscores. 15 characters at most.">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className={inputClass}
            autoFocus
            autoComplete="username"
          />
        </Field>
        <Field label="Name in print">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </Field>
        {error && <p className="text-xs text-seal">{error}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full mt-1">
          {submitting ? "Enrolling…" : "Enrol"}
        </Button>
      </form>
    </div>
  );
}
