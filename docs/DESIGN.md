# Penny Post — Design System

> Living reference. Extend it when a screen genuinely needs something; don't
> deviate because a token feels boring.

## 0. The premise

**A penny paper, if it had been a live wire instead of a daily sheet.**

The 1840 Penny Post made sending a message cheap enough that anyone could do
it — which is the same premise as this app. So the product isn't dressed as a
scrapbook or a Wild-West saloon poster; it's dressed as a **working press
room**: a newspaper flag, dispatches coming in over the wire, wax seals,
postmarks, ledger paper, and a colophon at the foot of the page.

### What the first attempt got wrong

Worth writing down, because these are the failure modes to check against:

1. **No value range.** Every surface sat within a few percent of the same
   beige. With no dark anywhere, nothing had depth or a focal point — the
   page read as one flat wash. *The single biggest fix was adding a genuinely
   dark band.*
2. **Texture-free.** A "paper" theme with no paper in it. Flat fills and 1px
   borders are the default look of every framework.
3. **Wrong body face.** A generic web serif says nothing. A typewriter face is
   period-true *and* legible — it does identity work for free.
4. **Ornament used as garnish.** A cursive logo bolted onto an otherwise
   default layout. Either the whole system commits or it reads as a costume.
5. **Text labels for actions.** Six words in a row under every post
   ("Reply Retweet Quote Like Save Edit Delete") looked like a debug toolbar.

### The governing rule

**Chrome carries the period. Content stays modern and legible.**

Masthead, footer, page ground, ornament, and empty states can be as
19th-century as they like. Running text sits on clean, high-contrast paper.
Ornament lives at edges and corners — never behind words. This is what lets a
1000-item feed stay scannable while still feeling like a printed object.

## 1. Type

Three families, three non-overlapping jobs. Overlap is what makes multi-font
systems turn to mud.

| Family | Job | Rule |
|---|---|---|
| **Pinyon Script** | The wordmark, and nothing else | Once per page. Never in UI, never below ~24px. |
| **Playfair Display** | Headings, author names, small-caps UI labels | 900 for headings; small-caps + `0.11em` tracking for labels. |
| **Courier Prime** | All body copy, metadata, numerals | The typewriter is the voice of the product. Tabular numerals for counts. |

Why a typewriter for body: typewriters are 1870s-onward, so it's period-honest;
monospace is highly legible on screen; and it instantly reads as *not a default
web app*. It's the highest-leverage single decision in the system.

Scale is in `tokens.css` (`--text-2xs` … `--text-3xl`). Base body is `0.9375rem`
— slightly under 16px because Courier runs large for its point size.

All fonts self-hosted via `@fontsource/*`. No runtime font fetch.

## 2. Colour

```
ink        #211b14   body text          ~13:1 on paper (AAA)
ink-soft   #574b3c   secondary text     ~7:1 (AA at all sizes)
ink-faint  #8a7b66   decorative only    never running text
paper        #eae0cc   page ground
paper-aged   #dfd2b8   recessed — quoted clippings, insets
paper-bright #f5efe1   raised — cards, inputs
rule         #c0ae8c   hairlines
dark       #1c1712   the contrast band
dark-soft  #33291f
dark-text  #cbbb9d
```

### Two inks, two jobs

- **Seal red `#8e2b22`** — actions and state. Likes, stamps, active tabs, the
  ledger rule, focus rings.
- **Indigo `#2c3e63`** — references. Links, `@mentions`, `#hashtags`.

Red and blue ink on a writing desk. The practical payoff: **a link is never
confusable with a button**, because they're not the same colour.

`ink-faint` is decorative-only by rule — it fails AA on paper, so it may sit
on icons and rules but never on text a user has to read.

No dark mode. An inverted paper theme is a different aesthetic (chalkboard),
not a palette flip. If it's ever wanted it's a deliberate second theme.

## 3. Texture

All generated — SVG turbulence and CSS gradients, ~1kb, crisp at any DPI.
Nothing is a bitmap.

- **Grain** (`--grain`): `feTurbulence` fractal noise, tiled.
- **Laid lines** (`--laid`): the faint horizontal chain lines of handmade stock.
- **Vignette**: radial darkening so the sheet has edges.
- **Ruled paper** (`--ruled`): horizontal rules for writing surfaces.

These composite on `body::before`, `position: fixed`, `mix-blend-mode: multiply`
at 55% opacity. Fixed rather than scrolling so the texture reads as a
stationary sheet that content moves across.

**Ceiling: ~4% effective opacity.** Anything heavier fights the text, and
fighting the text is how a textured theme becomes an unusable one.

## 4. Depth

- `--press` — inset. Type pressed into the sheet.
- `--lift-1` / `--lift-2` — a sheet above the page. Warm-toned, never grey.
- `--plate` — **hard 2px offset, no blur.** A printing plate. Buttons use this;
  pressing translates the element 2px and collapses the shadow, so the
  affordance is physical rather than a colour change.

Corners: `2px` maximum. Paper doesn't have rounded corners.

## 5. Components

### Seal (avatar) — `components/Avatar.tsx`
The most-repeated element in the app, so it sets the tone more than anything
else. A flat circle with initials is what every app ships; it reads as nothing.

This is a **pressed wax seal**: a lobed, slightly irregular perimeter generated
per-user, a radial dome highlight, initials struck as letterpress (dark
impression under a light catch-edge), and a ±4.5° tilt so seals aren't stamped
perfectly straight. Wax colour is picked deterministically from a **curated set
of seven historical wax colours** — a curated set rather than a random hue,
because random hues are exactly what makes generated palettes look synthetic.

Silhouette is identical with or without an uploaded image, so the feed keeps
its rhythm either way.

### Dispatch card — `components/TweetCard.tsx`
No box. Boxes-in-a-list is the default social-app look; a dashed hairline plus
the ledger rule gives the same separation with more character and less noise.
Actions are Phosphor line icons (`light` weight, `fill` when active) with
tabular counts. Owner controls (revise/destroy) stay at `opacity-0` until
hover or focus so they don't compete with the actions everyone uses.

### Ledger rule — `.ledger-margin`
The red margin line of accounts paper, at the **far left** of the column with
all content to its right. It was briefly placed between seal and text; that
splits a unit that reads as one thing. Far left is both more authentic and
less disruptive.

### Composer — `components/Composer.tsx`
A blank telegram form: printed heading, a dashed rule, and a textarea on ruled
paper (`background-attachment: local` so rules scroll with the text). The
character allowance is a **stamp that inks up** — a bare number is dead space;
a ring reads at a glance and only shows a figure once you're near the limit.

### Quoted clipping
`sheet-aged` with **tape** at the corner. A different paper tone plus a
physical fastening, rather than a nested rectangle.

### Torn edge — `TornEdge`
Turbulence-displaced rectangle used as a **mask on a solid-coloured strip**, so
the paper itself is ragged and no content can ever be clipped by it. Used at
surface boundaries (paper → dark footer, banner → page). A repeating zigzag
would read as decoration; an organic rag reads as a tear.

### Masthead & footer — `components/Layout.tsx`
The flag is a real newspaper flag: double rule above and below, wordmark, and
a dateline carrying **actual information** (issue number, today's date, "Price
One Penny" — the paper's own name doing work). The nav sticks; the flag is
allowed to scroll away, so identity lands on first paint without eating the
viewport thereafter.

The **dark footer** is what anchors the page. Torn top edge, colophon naming
the typefaces. Without a dark ground somewhere the whole design floats.

### Ornaments — `components/Ornament.tsx`
`Postmark` (circular, carries a real date), `Fleuron` (breaks a column without
a hard line), `Tape`, `Watermark` (compass rose at 3.5% behind the column —
keeps large empty areas from feeling blank), `InkUnderline` (a drawn pen
stroke for active tabs, not a straight 2px border).

## 6. Modern UX that survives the aesthetic

Non-negotiable, regardless of period:

- Body text passes **AAA**, secondary passes **AA**. Verified, not assumed.
- Tap targets **≥34px**, most ≥40px.
- `:focus-visible` rings on everything interactive.
- `prefers-reduced-motion` respected globally.
- Loading uses **skeletons shaped like the content**, not spinners — holds
  layout so nothing jumps.
- Empty states are written in the paper's voice and are a page of the product,
  not an error.
- Optimistic like/reprint/file with rollback on failure.
- Mobile: search moves to its own row rather than being squeezed; the feed is
  a single column at any width.

## 7. Vocabulary

Period nouns where they add colour, plain verbs where ambiguity would cost.
Icons carry the meaning; words reinforce it.

| UI | Term |
|---|---|
| Post | Dispatch |
| Feed | The Wire |
| Following feed | Subscriptions |
| Retweet | Reprint |
| Like | Seal |
| Bookmark | File |
| Profile | Correspondent's card / My Desk |
| Followers / Following | Readers / Reading |
| Edited | Revised |
| Sign up | Take out a subscription |

---
_Last updated: 2026-08-02. Full rebuild of the design system: renamed to Penny Post, three-font system with a typewriter body face, real value range with a dark band, generated paper texture, wax-seal avatars, Phosphor iconography, and period vocabulary._
