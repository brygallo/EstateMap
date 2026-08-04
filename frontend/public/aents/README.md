# Aents brand assets

Vendored from the Aents monorepo. **Do not edit, redraw, recolour or vectorise
these files.** They are exports of an approved master; regenerating them by
tracing a copy would fork the identity.

| File                       | Source                                                  |
| -------------------------- | ------------------------------------------------------- |
| `aents-brand-tile-120.png` | `packages/brand/exports/brand-tile/brand-tile-120.png`   |
| `aents-negative-240.png`   | `packages/brand/exports/negative/negative-240.png`       |
| `aents-symbol.png`         | `apps/web/public/brand/symbol.png`                       |
| `aents-symbol-negative.png`| `apps/web/public/brand/symbol-negative.png`              |

`brand-tile` is the mark every Aents surface puts at the head of its lockup: the
violet tile with the white A, exactly as `AentsLogo` in
`packages/ui-web/src/brand.tsx` renders it and as aents.net serves it. The tile
is part of the artwork, not a CSS box — the matching `.aents-brand-symbol` rule
in `app/globals.css` is copied verbatim from `@aents/ui-web` and deliberately
carries no border, background, shadow or hover. Adding any of those draws a
different logo. It renders at 38 px from a 120 px master, sharp through 3x.

**Never rebuild the Aents wordmark as text.** `AentsLogo` in `@aents/ui-web`
composes it in Plus Jakarta Sans, and `packages/brand/README.md` sanctions that
for sharpness, but the Brand Book plate «Sistema del logo» rules otherwise: panel
11 lists «No cambiar tipografía» among the forbidden uses, and the approved
wordmark is not Plus Jakarta Sans — its letterforms and letter-spacing belong to
the artwork. Panel 04 also reserves a 2x clear space that nothing may invade.
Both the header and the footer therefore pair the tile with the **product's own**
name, which no brand rule governs. When the Aents wordmark itself is needed, it
comes from `negative`, whole.

`negative` is the horizontal lockup for dark backgrounds, flattened to a single
raster with the approved letterforms. Nothing renders it today; it stays here as
the only sanctioned way to show the Aents wordmark on this site.

To update: copy the file again from the monorepo. If a smaller mark is ever
needed, the rules require the symbol alone below 120 px, not a shrunken lockup —
use `packages/brand/exports/symbol-negative/` instead.
