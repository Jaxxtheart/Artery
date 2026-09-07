# Org Design System

**Status:** v0.1 — living document
**Owner:** Jaxxtheart
**Canonical source:** [`Jaxxtheart/Artery` → `DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)

This is the baseline design system for every product, site, and internal tool
built across the Jaxxtheart / Artery GitHub profile. It exists so that
independent projects — which will legitimately look different from each
other — still *feel* like they came from the same hand: the same type
discipline, the same restraint with color, the same spacing logic, the same
attention to motion and detail.

This is **not** a component library and it doesn't lock every project into
one visual theme. Think of it as a constitution: a small set of fixed
foundations every repo inherits, plus a framework for how each project
expresses its own identity on top of those foundations.

> **Other repos should not copy this file.** They should link back to it
> (see [How other repos use this](#how-other-repos-use-this)) so there is
> always one source of truth. If a project needs to diverge from something
> here, that's a signal to open a discussion and either update this doc or
> record the exception explicitly in the project's own README.

---

## 1. Philosophy

1. **Typography is the design system.** Layout, hierarchy, and brand
   personality should come from type choices and type scale before they
   come from color, iconography, or decoration. If a screen still reads
   clearly with all color removed, the type system is doing its job.
2. **Restraint reads as confidence.** Default to near-monochrome UI (ink,
   paper, a handful of greys) plus exactly one accent color per product.
   Every additional color has to earn its place.
3. **Whitespace is a material, not a leftover.** Generous margins and line
   spacing are a deliberate design choice, not empty space to be filled.
   When in doubt, remove an element rather than shrink the spacing around it.
4. **Grid first, decoration second.** Every layout sits on a visible or
   implied grid. Alignment does more work than borders, shadows, or dividers.
5. **Motion explains, it doesn't perform.** Animation exists to clarify
   state changes (hover, load, transition between views) — fast, purposeful,
   easing-based. Nothing decorative loops, bounces, or draws attention to
   itself for its own sake.
6. **Consistency of *system*, not of *skin*.** A trading dashboard, a
   funding-application portal, and a marketing site can look nothing alike
   in color or layout and still both be unmistakably "ours" because they
   share type, spacing rhythm, and interaction discipline.

---

## 2. Typography

**Primary foundry: [Pangram Pangram](https://pangrampangram.com/).** All
Pangram Pangram fonts are free for drafting/personal use with paid
commercial licenses — confirm licensing per project before shipping to
production.

| Role | Typeface | Use |
|---|---|---|
| UI / body / product default | **PP Neue Montreal** | The workhorse grotesque sans. Interface copy, paragraphs, forms, tables, nav. Clean, neutral, highly legible at small sizes. |
| Display / editorial headlines | **PP Editorial New** | Large hero statements, pull quotes, section headers on marketing/content-led pages. A serif for moments that need warmth or authority — used sparingly and large. |
| Expressive / brand headlines | **PP Right Grotesk** (or **PP Neue Machina** for a more technical/futuristic register) | Bold, condensed, or wide cuts for hero type, wordmarks, and callouts that need to command attention. Pick one per project and stay consistent within it. |
| Monospace / data / code | **PP Fraktion Mono** (or **PP Right Grotesk Mono**) | Numbers, tickers, code blocks, timestamps, technical/data-dense UI (e.g. the trading dashboard). |

**Rules:**

- Two typefaces per product, maximum three. A body sans + one display face
  covers almost everything. Reach for a third only for data/mono contexts.
- Set body copy at a minimum of 16px on the web, with a line-height between
  1.4–1.6.
- Headlines run tight (1.0–1.15 line-height) with negative tracking at
  large sizes; body copy runs neutral-to-slightly-open tracking.
- Use a real type scale, not arbitrary sizes. Default scale (px, at 1rem =
  16px base): `12 / 14 / 16 / 18 / 21 / 24 / 32 / 40 / 56 / 72 / 96`.
- Fallback stack (until a font is licensed/self-hosted in a given repo):
  `"PP Neue Montreal", "Neue Haas Grotesk", "Helvetica Neue", Inter, -apple-system, sans-serif`
  for UI, and `"PP Editorial New", "Georgia", serif` for display.
- Self-host font files per project (`.woff2`) rather than hot-linking the
  foundry site. Subset where practical.

---

## 3. Color

Default posture: **near-monochrome base + one accent.** Dark-first is the
default direction for anything brand/portfolio/marketing-led (see
[§7 References](#7-references)); product dashboards and forms may run
light-first when legibility/density demands it — pick one direction per
project and commit.

### 3.1 Base neutral scale (tokens, not literal hex per project)

```
--ink-950   near-black       (primary text on light / page bg on dark)
--ink-800   dark grey        (secondary text on light)
--ink-500   mid grey         (muted text, borders on dark)
--ink-300   light grey       (dividers, disabled states)
--ink-100   near-white grey  (subtle surface tint)
--paper-0   white / true bg  (page bg on light / primary text on dark)
```

### 3.2 Accent

Each product picks exactly **one** accent hue and uses it deliberately:
primary CTAs, links, active/selected states, key data highlights. Everything
else stays neutral. Do not introduce a second "brand color" without a
documented reason (e.g. a semantic red for destructive/loss states in the
trading tools is allowed because it's functional, not decorative).

### 3.3 Semantic colors (functional only, not decorative)

```
--success   for confirmations, gains, positive deltas
--danger    for errors, losses, destructive actions
--warning   for caution states
```

Keep these desaturated enough to sit quietly next to the accent — they
should read as *state*, not compete with brand color.

---

## 4. Layout & Spacing

- **Spacing scale (4px base unit):** `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 /
  96 / 128`. Pick from this scale; don't invent one-off values.
- **Grid:** 12-column grid on desktop with generous gutters (24–32px);
  collapse to 4 columns on mobile. Content max-width around `1200–1280px`
  for text-heavy pages; full-bleed is fine for hero/imagery moments.
- **Margins over borders.** Prefer spacing and alignment to separate
  sections; reach for a hairline divider or shadow only when spacing alone
  can't do the job.
- **Asymmetry is allowed and encouraged** for marketing/portfolio-style
  pages (large type breaking the grid intentionally, offset imagery) — but
  it has to be *intentional* asymmetry sitting on a grid you could still
  point to, not sloppiness.

---

## 5. Motion & Interaction

- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo-ish) for
  entrances; simple `ease-in-out` for hover/state toggles.
- Standard durations: 120–180ms for micro-interactions (hover, focus),
  250–400ms for panel/page transitions. Nothing decorative runs longer
  than ~600ms.
- Respect `prefers-reduced-motion` everywhere — provide a non-animated
  fallback, don't just shorten the animation.
- Hover/focus states must be obvious and consistent: underline or weight
  shift for text links, subtle scale/opacity/translate for interactive
  cards and buttons — never color alone (accessibility).

---

## 6. Voice, Imagery & Content

- **Voice:** direct, confident, low on jargon and hype adjectives. Say the
  thing plainly; let the typography carry the weight instead of exclamation
  marks or superlatives.
- **Imagery:** when photography is used, prefer high-contrast, editorial
  treatment over stock-photo gloss. Product screenshots should be shown in
  minimal, real-looking frames — not skeuomorphic device mockups.
- **Icons:** one icon set per project (currently [Lucide](https://lucide.dev/)
  is in use in Artery Capital) — don't mix icon families within a product.

---

## 7. References

This section is the working reference library the visual direction above is
distilled from. It's meant to grow — every new site, foundry, or product we
admire gets logged here with what specifically we're borrowing, so the
"why" behind a decision stays traceable. Add entries via the log in
[`design/references.md`](./design/references.md); the table below is the
current summary.

| Reference | What it's for | What we're taking from it |
|---|---|---|
| [Pangram Pangram](https://pangrampangram.com/) | Type foundry | The typeface system in §2 (Neue Montreal / Editorial New / Right Grotesk / Fraktion Mono) and the foundry's own site convention of letting large, confident type carry the page with almost no chrome around it. |
| [jrands.com](https://jrands.com/) | Site/portfolio reference | Logged as a working reference for a minimal, type-forward personal/portfolio treatment. **Not yet directly reviewed in detail in this pass** — this environment's network egress blocked fetching the live site. Flagged in the reference log for a follow-up pass to extract concrete layout/spacing/motion notes. |
| [pixelorb.studio](https://pixelorb.studio/) | Site/studio reference | Logged as a working reference: a design studio site ("creative partners in an AI-first world") in the same modern, brand-forward, minimal-chrome register we're targeting. **Not yet directly reviewed in detail in this pass** — same egress limitation as above; needs a follow-up pass for concrete color/type/motion specifics. |

> **Note on the two site references above:** direct access to `jrands.com`
> and `pixelorb.studio` was blocked by network policy in the session that
> authored this version of the doc, so §1–§6 above are built from typeface
> knowledge of Pangram Pangram plus general knowledge of the design register
> both sites sit in — not from a pixel-level audit of either site. Treat the
> principles above as a solid v0.1 direction, but revisit
> [`design/references.md`](./design/references.md) and tighten §3 (color)
> and §5 (motion) once someone can browse both sites directly and log real
> specifics (screenshots, hex values, exact spacing).

To add a new reference going forward: append an entry to
`design/references.md` with the URL, date logged, and specific
takeaways — then fold anything that should change baseline behavior back
into the relevant section of this file.

---

## 8. Design Tokens

A starter, framework-agnostic token seed lives at
[`design/tokens.json`](./design/tokens.json). It mirrors §2–§4 above in a
machine-readable form so a project can import it directly (Tailwind config,
CSS custom properties, Style Dictionary, etc.) rather than re-typing values.
Treat the token *names and structure* as the stable contract across repos;
each project supplies its own accent value and, if it diverges, records why.

---

## 9. How other repos use this

Since projects live in separate repositories, don't copy this file — link
to it:

1. In each project's `README.md`, add a short section:

   ```md
   ## Design
   This project follows the org design system:
   https://github.com/Jaxxtheart/Artery/blob/main/DESIGN_SYSTEM.md
   ```

2. Where useful, import [`design/tokens.json`](./design/tokens.json)
   directly (e.g. `curl`/fetch it in a build step, or vendor a copy and
   note the commit it was synced from) rather than hand-transcribing values.
3. If a project needs to deviate from something in §1–§6, note the
   deviation and the reason in that project's own README rather than
   silently drifting — that keeps this doc honest as the source of truth.
4. Propose changes to the system itself as a PR against this file in
   `Jaxxtheart/Artery`, not by editing a copy in another repo.

---

## 10. Changelog

- **v0.1** — Initial version. Establishes typography (Pangram Pangram
  catalog), base color/spacing/motion principles, and the reference-log
  process. `jrands.com` and `pixelorb.studio` logged as references pending
  a detailed follow-up pass (see §7).
