# Design Reference Log

A running, append-only log of external sites, foundries, and products that
inform the [org design system](../DESIGN_SYSTEM.md). Every reference gets an
entry here before (or as) it's folded into `DESIGN_SYSTEM.md` proper — that
way we can always trace a design decision back to *why*.

**How to add an entry:** copy the template below, fill it in, add it to the
top of the log (newest first). If a new reference should change a baseline
rule in `DESIGN_SYSTEM.md`, update that file in the same PR and link back to
the log entry.

---

## Log

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
