import type { ReactNode } from "react";
import { Fleuron } from "./Ornament";

/** Loading: blank ruled sheets rather than a spinner. A skeleton that looks
 *  like the paper it's about to become reads as "setting type", and it holds
 *  layout so nothing jumps when content lands. */
export function LoadingSheets({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-t border-dashed border-rule px-4 py-4 flex gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rule-faint/60 shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 bg-rule-faint/60 w-1/3 animate-pulse" />
            <div className="h-2.5 bg-rule-faint/45 w-full animate-pulse" />
            <div className="h-2.5 bg-rule-faint/45 w-4/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty: an ornament and a line of copy in the paper's own voice. An empty
 *  state is a page of the product, not an error. */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-16 px-6 text-center">
      <Fleuron className="max-w-[180px] mx-auto mb-5" />
      <p className="font-display text-lg text-ink">{title}</p>
      {children && <p className="text-sm text-ink-soft mt-2 max-w-xs mx-auto">{children}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center">
      <p className="label text-2xs text-seal tracking-[0.18em]">Dispatch failed</p>
      <p className="text-sm text-ink-soft mt-2">{children}</p>
    </div>
  );
}

/** Column heading — a newspaper section head with rules either side. */
export function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px flex-1 bg-rule" />
      <h2 className="label text-2xs text-ink-soft tracking-[0.2em]">{children}</h2>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}
