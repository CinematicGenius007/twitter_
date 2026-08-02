import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth, ApiError } from "../lib/auth";
import { Button, Field, inputClass } from "../components/Button";
import { Fleuron } from "../components/Ornament";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(handle.trim(), displayName.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Take Out a Subscription</h1>
        <p className="text-xs text-ink-soft mt-1.5">Price one penny. Payable never.</p>
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
        <Field label="Password" hint="Eight characters or more.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
        {error && <p className="text-xs text-seal">{error}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full mt-1">
          {submitting ? "Registering…" : "Enrol"}
        </Button>
      </form>

      <p className="text-xs text-ink-soft text-center mt-5">
        Already enrolled?{" "}
        <Link to="/login" className="text-seal hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
