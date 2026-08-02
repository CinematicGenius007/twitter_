import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "../lib/auth";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { invalidateAll } from "../lib/invalidate";
import { Avatar } from "../components/Avatar";
import { Button, Field, inputClass } from "../components/Button";
import { SectionHead } from "../components/States";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function EditProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const headerFileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarStorageId, setAvatarStorageId] = useState<Id<"_storage"> | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [headerStorageId, setHeaderStorageId] = useState<Id<"_storage"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `user` resolves asynchronously from the Convex users.me query, so a
  // useState initializer would only ever see null on a fresh page load.
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name);
    setBio(user.bio ?? "");
    setLocation(user.location ?? "");
    setWebsite(user.website ?? "");
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) return <p className="py-10 text-center text-sm text-ink-soft">Loading…</p>;
  if (!user) return null;

  async function handleUpload(file: File, target: "avatar" | "header") {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, GIF or WebP images are accepted.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      if (target === "avatar") {
        setAvatarStorageId(storageId);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setHeaderStorageId(storageId);
      }
    } catch {
      setError("Couldn't upload that image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatarStorageId: avatarStorageId ?? undefined,
        headerStorageId: headerStorageId ?? undefined,
      });
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
        <button type="button" onClick={() => avatarFileRef.current?.click()} className="shrink-0">
          <Avatar
            handle={user.handle}
            displayName={displayName || user.display_name}
            avatarUrl={avatarPreview ?? user.avatar_url}
            size={56}
          />
        </button>
        <input
          ref={avatarFileRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleUpload(file, "avatar");
          }}
        />
        <div className="text-xs text-ink-soft">
          <p className="label text-2xs text-ink">Your seal</p>
          <p className="mt-0.5">Click the plate to replace your portrait.</p>
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

        <Field label="Banner" hint="JPEG, PNG, GIF or WebP.">
          <input
            ref={headerFileRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className={inputClass}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file, "header");
            }}
          />
        </Field>

        {uploading && <p className="text-2xs text-ink-faint italic">enclosing…</p>}
        {error && <p className="text-xs text-seal">{error}</p>}
        <div className="flex gap-3 mt-1">
          <Button type="submit" variant="primary" size="lg" disabled={submitting || uploading} className="flex-1">
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
