# Design Reference Log

A running, append-only log of external sites, foundries, and products that
inform the [org design system](../DESIGN_SYSTEM.md). Every reference gets an
entry here before (or as) it's folded into `DESIGN_SYSTEM.md` proper — that
way we can always trace a design decision back to *why*.

**How to add an entry:** copy the template below, fill it in, add it to the
top of the log (newest first). If a new reference should change a baseline
rule in `DESIGN_SYSTEM.md`, update that file in the same PR and link back to
the log entry.

This log has two kinds of entries: **external** references (sites, foundries,
studios we admire) and **internal precedent** — an audit of the design
already shipped across our own repos. Internal entries exist to make sure
the baseline in `DESIGN_SYSTEM.md` reflects what we actually build, not just
outside inspiration, and to give new projects real prior art to look at.
**Internal entries are read-only audits** — the source repos are not
modified as part of logging them here.

---

## Internal precedent — existing repos

Audited 2026-09-07 by cloning and reading each repo's actual CSS/Tailwind
config, not just its README. Per policy, **existing repos are unaffected —
this is documentation only.** Referencing the org design system (§9 of
`DESIGN_SYSTEM.md`) is the default for *new* projects going forward; nothing
here requires any of these repos to change.

### PaySick — full existing design system
- **Repo:** `Jaxxtheart/PaySick` — healthcare payment platform
- **Signal:** Already has its own `DESIGN_SYSTEM.md` (v1.0, dated
  2026-01-16) — the most complete design doc in the org before this one.
- **Palette:** Coral/red brand (`#FF4757` → `#E01E37` gradient) as the sole
  accent, near-black/gray neutrals (`#1A1A1A`, `#4A4A4A`, `#8A8A8A`,
  `#E5E5E5`, `#FAFAFA`), desaturated status colors (green/orange/blue/red)
  for badges only.
- **Type:** System font stack only (`-apple-system, ... sans-serif`) —
  explicitly chosen for native feel + zero web-font load cost. Weights
  300–700, hero heading at 72px down to 12–13px captions.
- **Spacing:** 8px grid, explicitly documented (`--spacing-1: 8px` … 64px).
- **Components:** Pill buttons (25–30px radius) with gradient fill + lift-on-
  hover, 12–16px radius cards, a full custom stroke-based SVG icon library
  (2px stroke, rounded caps) rather than a third-party icon set.
- **Philosophy:** States its own design principle explicitly — "Steve Jobs
  & Jony Ive meets Airbnb."
- **Takeaway for the org doc:** Confirms the "one accent + near-monochrome
  neutrals" rule (§3) independently arrived at before this doc existed. Its
  8px spacing grid and pill-button convention are good precedent for any
  future consumer-facing product.

### TrailA (traila) — nature/earth palette, semantic token architecture
- **Repo:** `Jaxxtheart/traila` — wildlife photography/video licensing
  marketplace (Next.js + Tailwind)
- **Palette:** Earthy, nature-driven — `sage #9CB08C`, `canopy #40573F`,
  `bone #FCFBF8` (bg), `deep #26332C` (text/inverse), `ochre #9E6026`
  (action accent), `ember #B45632` (warning accent), `lichen`, `ridge`,
  `slate`, `stone` filling out the rest of the scale.
- **Type:** Three-family system — **Quicksand** (display/rounded, brand
  personality), **Inter** (body), **Newsreader** (editorial serif for
  long-form/content moments). Exposed as `font-display` / `font-body` /
  `font-editorial` Tailwind utilities.
- **Architecture — the standout piece:** Raw palette lives in
  `tailwind.tokens.js`, merged into `tailwind.config.ts`, but components are
  told (in a code comment) to prefer **semantic CSS custom properties** from
  a separate `src/styles/tokens.css` (`--ta-bg`, `--ta-text-muted`,
  `--ta-accent-action`, …) over raw palette classes — raw classes are for
  one-off cases only. This is close to a working implementation of what
  `design/tokens.json` + `DESIGN_SYSTEM.md` §8–§9 describe in the abstract.
- **Other notes:** Pill-radius buttons (`--ta-radius-pill`), 44px minimum
  touch target on buttons, a documented 920px custom breakpoint (with an
  inline comment explaining *why* 920 and not a standard tablet breakpoint —
  a header row with a logo + 4 links + 2 actions needs the extra room),
  `prefers-reduced-motion` handled on the marquee animation.
- **Takeaway for the org doc:** This is the org's best existing example of
  "foundation + per-project semantic layer" (§9's intent) actually built.
  Worth pointing new Next.js/Tailwind projects at as a structural example
  (not a palette to copy).

### BonaLab — strict monochrome, ultralight type
- **Repo:** `Jaxxtheart/BonaLab` — medical image labeling platform
  (Next.js + Tailwind + shadcn/ui + Radix)
- **Palette:** Fully monochrome "bone" scale from `#FFFFFF`/`#FAF9F6`
  through `#1A1A1A`/`#000000` — no hue anywhere. Even rank/status badges
  (bronze/silver/gold/expert) are shades of gray rather than color-coded.
  Code comments explicitly frame this as "Minimalist Yeezy/Ive aesthetic."
- **Type:** Helvetica Neue / system stack. Deliberately ultralight —
  body text at weight 300, headings at weight 200 with *positive* wide
  letter-spacing (0.05em on headings, up to 0.5em via a `mega-wide`
  utility) — the inverse of most UI type (which tightens headline tracking).
- **Architecture:** Standard shadcn/ui pattern — HSL values in CSS custom
  properties (`--background`, `--primary`, …), consumed via
  `hsl(var(--x))` in Tailwind config; `tailwindcss-animate` for
  accordion/fade/slide keyframes.
- **Takeaway for the org doc:** A real, shipped counter-example to "tight
  tracking on headlines" — proves the org's actual range is wider than a
  single default, and that monochrome-as-brand (not just monochrome-as-
  neutral-base) is a live pattern here, not just a hypothetical.

### Kehr — dual-hue healthcare brand (teal + amber)
- **Repo:** `Jaxxtheart/Kehr` — healthcare app (Next.js + Tailwind +
  shadcn/ui + Prisma)
- **Palette:** Two named brand hues rather than one accent — teal
  `#1D9E75` ("Trust, Healing, Life") as primary, warm amber `#BA7517`
  ("Progress, Care, Warmth") as a secondary/progress accent — each with a
  full 50–900 ramp. Semantic aliases layered on top: `kehr-safe`,
  `kehr-watch`, `kehr-urgent` map back to the teal/amber/red scale by
  meaning, not just by raw hex.
- **Architecture:** shadcn/ui HSL-custom-property pattern, **with a working
  `.dark` block** — the org's clearest example of dark-mode tokens actually
  implemented end-to-end (light + dark HSL values for every semantic slot).
- **Type:** System UI stack (no custom webfont). A code comment calls out
  antialiasing choices explicitly for "low-DPI screens common in SA."
- **Takeaway for the org doc:** A real exception to "exactly one accent"
  (§3) that's still disciplined — two hues, each functionally named and
  scoped to a clear role, not decorative proliferation. Good precedent for
  when a second brand hue is justified (a paired meaning like
  trust/progress) vs. when it's just scope creep.

### VUES — clinical dashboard, semantic risk colors
- **Repo:** `Jaxxtheart/VUES` — clinical/imaging dashboard (Vite + React +
  Tailwind)
- **Palette:** Blue (`vues` scale, `#2563eb` mid) + teal as the two brand
  hues, plus a distinct `clinical` surface/text scale (`bg`, `surface`,
  `border`, `muted`, `text`) separate from the brand scale, and a 4-step
  semantic **risk** scale (`low`/`moderate`/`elevated`/`high` → green →
  yellow → orange → red) for clinical data specifically.
- **Type:** Inter (UI) + JetBrains Mono / Fira Code (data/mono) — the same
  sans+mono pairing philosophy as the org baseline, arrived at
  independently.
- **Components:** `.card`, `.btn-primary`/`.btn-secondary`, `.input`,
  `.table-header`/`.table-cell`, `.sidebar-link` all defined once as
  Tailwind `@layer components` classes — a flat, low-ceremony component
  layer rather than a full component library.
- **Takeaway for the org doc:** Good precedent for a **data-dense/dashboard**
  register specifically (vs. PaySick/Traila's more marketing-led register) —
  confirms Inter+mono as a real recurring choice for that context, and the
  risk-scale pattern is a reusable idea for any product with severity/status
  data (worth referencing for the trading tools in this repo, e.g.).

### SANParks — no frontend design to audit
- **Repo:** `Jaxxtheart/SANParks` — SANParks Media Exchange (Node/TS API,
  `public/index.html` only, no styling framework or component layer)
- **Takeaway:** Backend-only at this point; nothing to extract. Logged so a
  future pass doesn't re-check it for nothing.

### Jaxxtheart/Jaxxtheart (profile repo) — unstyled legacy app
- **Repo:** `Jaxxtheart/Jaxxtheart` — contains an old Create React App
  ("Torque Analytics" / radio ad monitoring) plus a stale `artery-capital/`
  copy.
- **Takeaway:** Default CRA boilerplate CSS only (system font stack, no
  custom palette or components) — no design signal, and the `artery-capital`
  subfolder is a duplicate of this repo, not a separate reference.

---

## Log

### 2026-09-07 — cuedesign.space, "Weekly Drop" series (site reference)
- **URL:** https://cuedesign.space/ — surfaced via a screen-recording tweet
  from [@Alok619308](https://x.com/Alok619308) captioned "Page Transition
  Series." Cue's own positioning (per search) is "best-in-class components,"
  drawing on "patterns from 95 design systems."
- **Category:** Component/interaction gallery (a curated index of named,
  reusable motion patterns — closer to a catalog than a single product)
- **Status:** **Reviewed directly** — the user supplied 5 in-app
  screenshots/recording frames, so this is a real visual audit, not a
  secondhand description (unlike the jrands.com / pixelorb.studio entries
  above, which are still pending a live visit).
- **Takeaways:**
  - **Type pairing, confirmed at high fidelity:** a bold, high-contrast
    display serif (the "DROP" wordmark — tight, almost woodtype-heavy
    verticals, sharp bracketed serifs) paired with a lighter *italic* serif
    for a secondary word above it ("WEEKLY"), against small-caps,
    wide-tracked sans-serif "eyebrow" labels (`FRESH INTERACTIONS FOR A
    MORE EXPRESSIVE WEB.`, `05 / INTERACTION`, `SWIPE TO EXPLORE`). This is
    a stronger, screenshot-verified version of the editorial-serif +
    grotesque-label pairing already in §2 — folded into §2.1 below as a
    named "eyebrow label" pattern.
  - **Photo-caption convention:** a one-line italic serif caption sits under
    each large media block, set off by a thin vertical rule on its left
    edge — reads like a print photo credit/footnote, not a UI microcopy
    convention. Folded into §2.1.
  - **Color discipline — chrome vs. content:** the site shell itself is
    strictly two-tone — warm off-white/cream background (reads roughly
    `#F0EEE6`), near-black text, thin light-gray hairline rules as the only
    dividers. All saturated color (the red timber-frame roof photo, a solid
    blue "Page Transition" card, an orange/red circular preloader, a warm
    living-room photo) lives *inside* the exhibited work samples, never in
    the surrounding UI chrome. A clean, reusable rule: **let the content
    carry the color; keep the frame neutral.** Folded into §3.
  - **Catalog/index layout:** a numbered two-column grid (01–06), each cell
    a large media thumbnail over a serif two-line title, separated by
    hairlines — then each item gets its own detail block repeating a fixed
    template (category/number eyebrow → two-line serif headline → short
    tracked-caps pitch, right-aligned → full-width media → italic ruled
    caption → hairline → next item). Worth citing as a pattern for any
    future "index of things" page (a components/pattern library, a
    portfolio, a docs catalog).
  - **Motion vocabulary (idea bank, not a spec):** the six named
    interactions shown — *Block Reveal* (scroll-driven parallax with a
    color-block wipe revealing text line by line), *Ribbon Curtain* and
    *Obsidian Curtain* (layered full-bleed page-transition curtains),
    *Four-Colour Circular Wipe Preloader* (sequential circular clip-path
    reveals), *Cascade Bloom* (pinned hero, center-out image bloom, splitting
    headline), *Free Fall* (portfolio grid tiles that fall away with
    rotation/jitter on scroll) — are all *expressive, one-shot* moments, a
    register more theatrical than §5's product-UI motion rules allow. Rather
    than changing §5's restraint for product UI, this justifies a new §5.1
    carve-out: expressive signature motion is fine for a marketing/portfolio
    **hero moment specifically**, capped at one per page, still gated by
    `prefers-reduced-motion`.
  - **Black circular FAB affordance:** a solid black circle with a white
    arrow, paired with tracked-caps "SWIPE TO EXPLORE" — a clear, minimal
    "more content this way" affordance worth keeping in mind for any
    horizontally-scrollable section.
- **Not taken:** no color/type token values are prescribed here — cream/
  black is cuedesign.space's brand, not ours. What's folded into the org doc
  below is structural pattern (pairing logic, layout template, color
  discipline, motion vocabulary), the same way the internal-precedent audit
  above extracts patterns rather than copying any one product's palette.

### 2026-09-07 — Pangram Pangram (foundry)
- **URL:** https://pangrampangram.com/
- **Category:** Typography / type foundry
- **Status:** Reviewed (via search/knowledge — direct site fetch was
  blocked by network egress policy in the authoring session; catalog
  details are from general/public knowledge of the foundry, not a live
  screenshot audit).
- **Takeaways:**
  - Foundry catalog anchors the org type system: **PP Neue Montreal**
    (UI/body grotesque), **PP Editorial New** (display serif), **PP Right
    Grotesk** / **PP Neue Machina** (expressive display), **PP Fraktion
    Mono** (data/mono).
  - Fonts are free-to-try, paid commercial license — check licensing
    per project before shipping to production, self-host `.woff2` files.
  - Foundry's own site convention worth carrying forward: very large type,
    minimal surrounding chrome, let the typeface itself be the hero image.
- **Follow-up:** none blocking; revisit once the site is browsable to
  confirm exact weight names/numbers for each family and pull direct visual
  references for how they present type at scale.

### 2026-09-07 — jrands.com (site reference)
- **URL:** https://jrands.com/
- **Category:** Portfolio / personal site
- **Status:** **Pending detailed review.** Direct fetch was blocked by
  network egress policy in the authoring session (`EGRESS_BLOCKED` /
  proxy `connect_rejected`). Not incorporated into `DESIGN_SYSTEM.md`
  beyond being logged as an intended reference.
- **Takeaways:** _(none captured yet — needs a real visit)_
- **Follow-up:** Someone with unrestricted browsing (or a future session
  without this network restriction) should visit the site and capture:
  color palette (hex), exact type choices/scale, grid/layout approach,
  spacing rhythm, nav pattern, and any motion/interaction details. Update
  this entry and fold anything that should be a baseline rule into
  `DESIGN_SYSTEM.md` §3–§5.

### 2026-09-07 — pixelorb.studio (site reference)
- **URL:** https://pixelorb.studio/
- **Category:** Design studio site
- **Status:** **Pending detailed review.** Same egress restriction as
  above — search results confirm it's a NYC-based studio positioned as
  "creative partners in an AI-first world," building brand identity, web,
  and product design for startups, but no pixel-level detail was captured.
- **Takeaways:** _(none captured yet — needs a real visit)_
- **Follow-up:** Same as jrands.com above — capture palette, type, layout,
  spacing, motion once the site can be browsed directly.

---

## Template

```md
### YYYY-MM-DD — Name (category)
- **URL:**
- **Category:** Typography / Site / Product / Other
- **Status:** Reviewed / Pending review
- **Takeaways:**
  -
- **Follow-up:**
```
