# Design System — 1890s Paper

> Status: living reference, not a hard contract. Tokens below are the base — extend the palette/scale when a real screen needs it, don't invent a parallel one.

Direction: a Twitter clone styled like a late-1800s newspaper/letterpress broadsheet. Aged paper, engraved ink, one cursive display face used sparingly, everything else set in a readable serif. The goal is "old newspaper you can actually use," not "unreadable calligraphy."

## 1. Typography

Two-font system, strict roles — do not let the script font leak into body copy, it becomes unreadable fast at small sizes.

| Role | Font | Usage |
|---|---|---|
| Display / wordmark / mastheads | **Alex Brush** (cursive script) | App name/logo, section mastheads ("Timeline", "Profile" as a page banner), never below ~28px |
| Headings (h1–h3, tweet author name in large contexts) | **Playfair Display** | High-contrast serif, feels like a broadsheet headline |
| Body text (tweet content, UI labels, buttons) | **Lora** | Readable serif at 14–16px, holds up in dense feed layout |
| Numerals / timestamps / metadata | **Lora**, tabular-nums where available | Consistent width for counters (likes/retweets ticking up) |

Self-host all three (Fontsource or local `.woff2`) — no runtime Google Fonts fetch, this is a local-only app.

Type scale (rem, 16px base):

```
--text-xs:   0.75rem   (metadata, timestamps)
--text-sm:   0.875rem  (secondary labels)
--text-base: 1rem      (tweet body)
--text-lg:   1.25rem   (profile display name)
--text-xl:   1.75rem   (page heading, Playfair)
--text-2xl:  2.5rem    (masthead, Alex Brush)
```

## 2. Color

Sepia/parchment base, deep ink for text, single maroon accent for actions (like an old letterpress red). Avoid modern saturated blues/greens — they break the period feel immediately.

```
--paper:        #f4ecd8   /* base background */
--paper-raised: #ebe0c6   /* cards, composer */
--ink:          #3a2f1e   /* primary text */
--ink-faded:    #6b5d47   /* secondary text, metadata */
--rule:         #c9b98f   /* hairline dividers, borders */
--accent:       #7a1f2b   /* maroon — likes, links, primary actions, active states */
--accent-faded: #a8555f   /* hover/disabled accent */
```

Dark mode is out of scope for v1 — a paper theme inverted is a different aesthetic (chalkboard, not paper). If it's ever wanted, that's a deliberate second theme, not a `prefers-color-scheme` flip of these tokens.

## 3. Texture & ornament

- Background: subtle paper-grain, SVG fractal noise (`feTurbulence`) as a tiled background-image, low opacity (~4%) over `--paper`. Not a JPEG texture — keep it vector/generated so it stays crisp and small.
- Dividers: 1px `--rule` hairlines between feed items, not shadow-based cards. Cards-with-shadows read as Material Design, not 1890s.
- Avatar frame: thin double-ring border (`--rule` outer, `--ink` inner hairline) — evokes a wax-seal/cameo frame without literally drawing a wax seal.
- Buttons: small-caps label, letter-spacing `0.05em`, 1px `--ink` border, no border-radius beyond ~2px (engraved-plate look, not rounded modern pill).
- Drop caps: first letter of a profile bio set large in Playfair, float-left — a signature "old print" detail, low effort high payoff.

## 4. Layout

- Feed: single newspaper column, max-width ~600px, generous vertical rhythm between tweets (hairline rule between, not big gaps).
- Profile: masthead-style header (cursive handle as if a newspaper section name), stats row (tweets/followers/following) set in small-caps Lora.
- Composer: framed like a "letter to the editor" box — bordered textarea, serif placeholder text.

## 5. Component patterns (soft convention, grow as needed)

- Tokens live in one CSS file (`apps/web/src/styles/tokens.css`) as CSS custom properties — Tailwind theme extends from these, doesn't redefine them. Single source of truth for color/type, no duplicate hex values inside `tailwind.config`.
- Icons: prefer simple line-art (thin stroke, 1.5px) over filled modern icon sets — filled icons read as app-y, not print-y. Actual icon set choice is an implementation call, not fixed here.
- Every new component reuses existing tokens before adding a new color/size. If a screen genuinely needs something the scale doesn't have, add it to `tokens.css` with a comment explaining why — don't hardcode a one-off hex in a component file.

## 6. What this doc is not

Not a Figma file, not a component library spec. It's enough for an AI or a human to make consistent calls without a designer in the loop, and to recognize "this doesn't fit the system" when it doesn't. Deviate when a screen genuinely needs it; don't deviate because the default token feels boring.

---
_Last updated: 2026-08-02. Initial design system for the from-scratch rebuild._
