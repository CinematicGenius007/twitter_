import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button, Field, inputClass } from "../components/Button";
import { Fleuron } from "../components/Ornament";

export function CompleteProfilePage() {
  const completeProfile = useMutation(api.users.completeProfile);
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
