import type { ButtonHTMLAttributes, ReactNode } from "react";

/*
  Buttons are printing plates: hard offset shadow (not a soft blur), small
  caps, letterspaced. Pressing moves the plate down onto the sheet and the
  shadow collapses — a physical affordance instead of a colour change.
*/

type Variant = "primary" | "secondary" | "quiet";

const base =
  "label inline-flex items-center justify-center gap-2 border transition-all duration-100 " +
  "disabled:opacity-40 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper-bright border-ink hover:bg-dark active:translate-x-[2px] active:translate-y-[2px] " +
    "shadow-[2px_2px_0_var(--rule)] active:shadow-none disabled:active:translate-0",
  secondary:
    "bg-paper-bright text-ink border-ink hover:bg-paper active:translate-x-[2px] active:translate-y-[2px] " +
    "shadow-[2px_2px_0_var(--rule)] active:shadow-none disabled:active:translate-0",
  quiet: "bg-transparent text-ink-soft border-transparent hover:text-seal hover:border-rule",
};

const sizes = {
  sm: "text-2xs px-3 min-h-[32px]",
  md: "text-xs px-5 min-h-[40px]",
  lg: "text-sm px-6 min-h-[46px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/** Text input styled as a filled-in form field: recessed, ruled underline. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label text-2xs text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full bg-paper border border-rule px-3 py-2.5 font-body text-base text-ink " +
  "shadow-[inset_0_1px_3px_rgba(33,27,20,0.09)] outline-none " +
  "placeholder:text-ink-faint focus:border-seal transition-colors";
