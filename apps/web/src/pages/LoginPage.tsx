import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth, ApiError } from "../lib/auth";
import { Button, Field, inputClass } from "../components/Button";
import { Fleuron } from "../components/Ornament";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(handle.trim(), password);
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
        <h1 className="font-display font-black text-xl text-ink">Subscribers' Entrance</h1>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>

      <form onSubmit={handleSubmit} className="sheet p-6 flex flex-col gap-4">
        <Field label="Handle">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className={inputClass}
            autoFocus
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </Field>
        {error && <p className="text-xs text-seal">{error}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full mt-1">
          {submitting ? "Checking…" : "Sign in"}
        </Button>
      </form>

      <p className="text-xs text-ink-soft text-center mt-5">
        Not yet a subscriber?{" "}
        <Link to="/register" className="text-seal hover:underline underline-offset-4">
          Take one out
        </Link>
      </p>
    </div>
  );
}
