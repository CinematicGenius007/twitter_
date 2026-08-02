import { useId } from "react";
import { initials } from "../lib/format";

/*
  A wax seal, not a circle with letters in it.

  Reasoning: an avatar is the single most-repeated element in a feed, so it
  sets the tone more than any other component. A flat circle + initials is
  the default every app ships — it reads as nothing. A pressed wax seal is
  period-true, gives each user a distinct identity through wax colour, and
  carries real depth (dome highlight, pressed type) at 36px.

  The silhouette is identical whether or not the user has an uploaded image,
  so the feed keeps a consistent rhythm either way.
*/

/** Wax was sold in a handful of stock colours. A curated set beats a random
 *  hue — random hues are what make generated palettes look synthetic. */
const WAX = [
  "#b03a2b", // scarlet
  "#94301f", // oxblood
  "#a85a2c", // burnt sienna
  "#6d6f3e", // bronze-olive
  "#41598a", // indigo
  "#834065", // plum
  "#94612f", // seal brown
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Lobed, slightly irregular perimeter — wax squeezed out under a matrix.
 *  Smoothed through midpoints so it reads as molten, not as a gear. */
function sealPath(seed: number, lobes: number): string {
  const cx = 50;
  const cy = 50;
  const steps = 72;
  const pts: [number, number][] = [];

  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble = Math.sin(a * lobes + (seed % 10)) * 1.9;
    const drift = Math.sin(a * 3 + (seed % 7)) * 1.1;
    const r = 45 + wobble + drift;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }

  const mid = (p: [number, number], q: [number, number]) =>
    [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as [number, number];

  let d = `M ${mid(pts[pts.length - 1]!, pts[0]!).join(" ")}`;
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i]!;
    const next = pts[(i + 1) % pts.length]!;
    const m = mid(cur, next);
    d += ` Q ${cur[0]} ${cur[1]} ${m[0]} ${m[1]}`;
  }
  return d + " Z";
}

export function Avatar({
  handle,
  displayName,
  avatarUrl,
  size = 40,
}: {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const seed = hashString(handle);
  const wax = WAX[seed % WAX.length]!;
  const lobes = 11 + (seed % 4);
  const path = sealPath(seed, lobes);
  const tilt = ((seed % 11) - 5) * 0.9; // ±4.5°, so seals aren't stamped perfectly straight

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0 select-none"
      style={{ transform: `rotate(${tilt}deg)`, overflow: "visible" }}
      role="img"
      aria-label={displayName}
    >
      <defs>
        <radialGradient id={`wax-${uid}`} cx="33%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="38%" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="78%" stopColor="#000" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={path} />
        </clipPath>
      </defs>

      {/* the sheet beneath catches a little shadow from the raised wax */}
      <path d={path} fill="rgba(33,27,20,0.28)" transform="translate(1.2 1.8)" />

      {avatarUrl ? (
        <>
          <image
            href={avatarUrl}
            x="0"
            y="0"
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#clip-${uid})`}
          />
          <path d={path} fill="none" stroke={wax} strokeWidth="4" />
          <path d={path} fill="none" stroke="rgba(33,27,20,0.45)" strokeWidth="1" />
        </>
      ) : (
        <>
          <path d={path} fill={wax} />
          <path d={path} fill={`url(#wax-${uid})`} />
          {/* inner impression ring — the raised rim of the matrix */}
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.6" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" transform="translate(0 -1.2)" />

          {/* initials, pressed: dark impression under a light catch-edge */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(0,0,0,0.5)"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
            transform="translate(0 1.4)"
          >
            {initials(displayName)}
          </text>
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,250,240,0.92)"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {initials(displayName)}
          </text>
        </>
      )}
    </svg>
  );
}
