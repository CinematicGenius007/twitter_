import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { invalidateAll } from "../lib/invalidate";
import type { Profile } from "../lib/types";
import { Avatar } from "../components/Avatar";
import { Button, Field, inputClass } from "../components/Button";
import { SectionHead } from "../components/States";

export function EditProfilePage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headerUrl, setHeaderUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `user` resolves asynchronously (GET /auth/me on mount), so a useState
  // initializer would only ever see null on a fresh page load.
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name);
    setBio(user.bio ?? "");
    setLocation(user.location ?? "");
    setWebsite(user.website ?? "");
    setAvatarUrl(user.avatar_url ?? "");
    setHeaderUrl(user.header_url ?? "");
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) return <p className="py-10 text-center text-sm text-ink-soft">Loading…</p>;
  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.patch<{ user: Profile }>("/users/me", {
        display_name: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar_url: avatarUrl.trim(),
        header_url: headerUrl.trim(),
      });
      await refresh();
      invalidateAll(queryClient);
      navigate(`/${user!.handle}`);
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      <Link
        to={`/${user.handle}`}
        className="inline-flex items-center gap-1.5 label text-2xs text-ink-soft hover:text-seal transition-colors py-3"
      >
        <ArrowLeft size={13} weight="light" /> Back to my desk
      </Link>

      <h1 className="font-display font-black text-xl text-ink">Correspondent's Card</h1>
      <p className="text-xs text-ink-soft mt-1">
        How you appear in print. Your handle{" "}
        <span className="text-ink">@{user.handle}</span> is fixed at enrolment.
      </p>

      <div className="flex items-center gap-4 mt-5 sheet p-4">
        <Avatar handle={user.handle} displayName={displayName || user.display_name} avatarUrl={avatarUrl || null} size={56} />
        <div className="text-xs text-ink-soft">
          <p className="label text-2xs text-ink">Your seal</p>
          <p className="mt-0.5">
            Struck from your handle. Give an image URL below to replace it.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="sheet p-6 flex flex-col gap-4 mt-4">
        <Field label="Name in print">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Notice">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Whereabouts">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Correspondence">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>

        <SectionHead>Plates</SectionHead>

        <Field label="Portrait URL">
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Banner URL">
          <input value={headerUrl} onChange={(e) => setHeaderUrl(e.target.value)} className={inputClass} />
        </Field>

        {error && <p className="text-xs text-seal">{error}</p>}
        <div className="flex gap-3 mt-1">
          <Button type="submit" variant="primary" size="lg" disabled={submitting} className="flex-1">
            {submitting ? "Setting…" : "Set in type"}
          </Button>
          <Button type="button" variant="quiet" size="lg" onClick={() => navigate(`/${user!.handle}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
