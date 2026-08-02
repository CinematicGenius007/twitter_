/*
  Physical vocabulary for the paper world: torn edges, tape, postmarks,
  fleurons, watermarks. Everything here is generated SVG/CSS — no bitmaps,
  so it stays crisp at any DPI and costs almost nothing to ship.
*/

/** A ragged paper edge. Renders a strip of `color` whose far edge is torn.
 *  Sits at the boundary between two surfaces (e.g. paper → dark footer). */
export function TornEdge({
  color = "var(--paper)",
  flip = false,
  height = 24,
  className = "",
}: {
  color?: string;
  flip?: boolean;
  height?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        height,
        background: color,
        maskImage: "var(--torn-mask)",
        WebkitMaskImage: "var(--torn-mask)",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        transform: flip ? "scaleY(-1)" : undefined,
      }}
    />
  );
}

/** Translucent tape holding a clipping down. Two strips, opposite angles. */
export function Tape({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className="absolute w-16 h-[22px] pointer-events-none z-10"
      style={{
        top: -11,
        [side]: -12,
        background:
          "linear-gradient(105deg, rgba(246,240,224,0.88), rgba(222,209,178,0.8))",
        borderTop: "1px solid rgba(255,253,246,0.7)",
        borderBottom: "1px solid rgba(150,132,98,0.35)",
        transform: `rotate(${side === "left" ? -24 : 24}deg)`,
        boxShadow: "0 2px 4px rgba(33,27,20,0.18)",
      }}
    />
  );
}

/** Circular postmark — a genuine period artefact that also carries real
 *  information (a date), so it earns its place rather than being decoration. */
export function Postmark({ label, sub, className = "" }: { label: string; sub?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex flex-col items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: 74,
        height: 74,
        borderRadius: "50%",
        border: "2px solid var(--seal)",
        boxShadow: "inset 0 0 0 3px transparent, inset 0 0 0 4px var(--seal)",
        color: "var(--seal)",
        opacity: 0.62,
        transform: "rotate(-13deg)",
        lineHeight: 1.1,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontVariant: "small-caps",
          fontSize: 9,
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </span>
      {sub && (
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
          {sub}
        </span>
      )}
    </span>
  );
}

/** Typographic flower — the classic way to break a column without a hard line. */
export function Fleuron({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 text-rule ${className}`}>
      <span className="flex-1 border-t border-rule" />
      <svg width="22" height="12" viewBox="0 0 22 12" fill="none" className="text-ink-faint">
        <path
          d="M11 1c2 3 5 4 8 4-3 0-6 1-8 4-2-3-5-4-8-4 3 0 6-1 8-4Z"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="11" cy="6" r="1.2" fill="currentColor" />
      </svg>
      <span className="flex-1 border-t border-rule" />
    </div>
  );
}

/** Faint compass-rose watermark, fixed behind the column — the inspiration
 *  uses exactly this trick to keep large empty areas from feeling blank. */
export function Watermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="fixed pointer-events-none select-none"
      style={{
        width: 620,
        height: 620,
        top: "42%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        opacity: 0.035,
        zIndex: 0,
        color: "var(--ink)",
      }}
    >
      <g stroke="currentColor" strokeWidth="0.7" fill="none">
        <circle cx="100" cy="100" r="92" />
        <circle cx="100" cy="100" r="74" />
        <circle cx="100" cy="100" r="40" />
        {Array.from({ length: 32 }).map((_, i) => {
          const a = (i * Math.PI * 2) / 32;
          const inner = i % 4 === 0 ? 62 : 70;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * inner}
              y1={100 + Math.sin(a) * inner}
              x2={100 + Math.cos(a) * 74}
              y2={100 + Math.sin(a) * 74}
            />
          );
        })}
      </g>
      <g fill="currentColor" opacity="0.55">
        {[0, 90, 180, 270].map((deg) => (
          <path
            key={deg}
            d="M100 22 L109 96 L100 106 L91 96 Z"
            transform={`rotate(${deg} 100 100)`}
          />
        ))}
      </g>
      <g fill="currentColor" opacity="0.28">
        {[45, 135, 225, 315].map((deg) => (
          <path key={deg} d="M100 46 L106 96 L100 103 L94 96 Z" transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
    </svg>
  );
}

/** Hand-drawn underline for the active tab — a ruled pen stroke, not a
 *  perfectly straight 2px border. Subtle, but it's the difference between
 *  "themed" and "a bootstrap tab with sepia paint on it". */
export function InkUnderline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      className="absolute left-0 right-0 -bottom-px h-1.5 w-full text-seal"
    >
      <path
        d="M1 3.4c14-1.7 28-2.4 49-2.1 21 .3 35 1.1 49 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
