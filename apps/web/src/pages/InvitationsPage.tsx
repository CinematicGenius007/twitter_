import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { EnvelopeSimple, Link as LinkIcon, ArrowClockwise, Prohibit, Check } from "@phosphor-icons/react";
import { convexClient } from "../lib/convexClient";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../lib/auth";
import { useMyInvites } from "../lib/queries";
import { Button, Field, inputClass } from "../components/Button";
import { Empty, LoadingSheets, SectionHead } from "../components/States";
import { Fleuron } from "../components/Ornament";
import { relativeTime } from "../lib/format";
import type { Id } from "../../convex/_generated/dataModel";

type Status = "pending" | "accepted" | "revoked" | "expired";

/** Period label + colour per state. Withdrawn/lapsed letters stay on the page
 *  greyed rather than disappearing — the ledger shows what was spent. */
const STATUS: Record<Status, { label: string; className: string }> = {
  pending: { label: "Awaiting reply", className: "text-seal" },
  accepted: { label: "Taken up", className: "text-ink" },
  revoked: { label: "Withdrawn", className: "text-ink-faint" },
  expired: { label: "Lapsed", className: "text-ink-faint" },
};

function cleanError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong.";
  // Convex wraps thrown errors with its own framing; keep only our sentence.
  return err.message.replace(/^.*Uncaught Error:\s*/s, "").replace(/\s+at handler.*$/s, "").trim();
}

export function InvitationsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useMyInvites(!!user);

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["invites", "mine"] });
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setBusy("send");
    setError(null);
    setNotice(null);
    try {
      const result = await convexClient.action(api.invites.send, { email: email.trim() });
      setEmail("");
      setNotice(`Letter posted to ${result.email}.`);
      refresh();
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleRevoke(inviteId: string) {
    setBusy(inviteId);
    setError(null);
    setNotice(null);
    try {
      await convexClient.action(api.invites.revoke, { inviteId: inviteId as Id<"invites"> });
      refresh();
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleResend(inviteId: string) {
    setBusy(inviteId);
    setError(null);
    setNotice(null);
    try {
      await convexClient.action(api.invites.resend, { inviteId: inviteId as Id<"invites"> });
      setNotice("Letter posted again.");
      refresh();
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(code: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/invitation/${code}`);
    setCopied(code);
    window.setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return <LoadingSheets count={3} />;
  if (!user) {
    return (
      <Empty title="Subscribers only">
        <Link to="/login" className="text-seal underline">
          Sign in
        </Link>{" "}
        to write letters of introduction.
      </Empty>
    );
  }

  const remaining = data?.remaining ?? 0;
  const allowance = data?.allowance ?? 0;
  const invites = data?.invites ?? [];

  return (
    <div className="py-6">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Letters of Introduction</h1>
        <p className="text-xs text-ink-soft mt-1.5 max-w-sm mx-auto">
          The paper takes no subscriptions off the street. A new correspondent is admitted only on the
          introduction of an existing one.
        </p>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>

      <form onSubmit={handleSend} className="sheet p-6 flex flex-col gap-4">
        <Field
          label="Address the letter to"
          hint="The invitation binds to this address. Nobody else can take it up, whoever holds the link."
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="correspondent@example.com"
            autoComplete="off"
            required
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <span className="label text-2xs text-ink-faint">
            {remaining} of {allowance} remaining
          </span>
          <Button type="submit" variant="primary" disabled={busy === "send" || remaining === 0 || !email.trim()}>
            <EnvelopeSimple size={14} weight="light" />
            {busy === "send" ? "Posting…" : "Post the letter"}
          </Button>
        </div>

        {error && <p className="text-xs text-seal">{error}</p>}
        {notice && <p className="text-xs text-ink-soft">{notice}</p>}
      </form>

      <SectionHead>The register</SectionHead>

      {isLoading ? (
        <LoadingSheets count={2} />
      ) : invites.length === 0 ? (
        <Empty title="No letters written yet">
          Every subscriber may introduce {allowance}. Choose them well.
        </Empty>
      ) : (
        <ul>
          {invites.map((inv) => {
            const status = STATUS[inv.status as Status];
            const isBusy = busy === inv._id;
            return (
              <li key={inv._id} className="border-t border-dashed border-rule py-4 px-1">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-body text-sm text-ink break-all">{inv.email}</span>
                  <span className={`label text-2xs ${status.className}`}>{status.label}</span>
                </div>

                <p className="text-2xs text-ink-faint mt-1">
                  Written {relativeTime(inv.createdAt)}
                  {inv.status === "pending" && ` · lapses ${new Date(inv.expiresAt).toLocaleDateString()}`}
                  {inv.status === "accepted" && inv.acceptedHandle && (
                    <>
                      {" · now "}
                      <Link to={`/${inv.acceptedHandle}`} className="text-seal hover:underline">
                        @{inv.acceptedHandle}
                      </Link>
                    </>
                  )}
                </p>

                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {inv.status === "pending" && (
                    <Button size="sm" variant="secondary" onClick={() => void copyLink(inv.code)}>
                      {copied === inv.code ? <Check size={13} weight="light" /> : <LinkIcon size={13} weight="light" />}
                      {copied === inv.code ? "Copied" : "Copy link"}
                    </Button>
                  )}
                  {(inv.status === "pending" || inv.status === "expired") && (
                    <Button size="sm" variant="quiet" disabled={isBusy} onClick={() => void handleResend(inv._id)}>
                      <ArrowClockwise size={13} weight="light" />
                      Send again
                    </Button>
                  )}
                  {inv.status === "pending" && (
                    <Button size="sm" variant="quiet" disabled={isBusy} onClick={() => void handleRevoke(inv._id)}>
                      <Prohibit size={13} weight="light" />
                      Withdraw
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
