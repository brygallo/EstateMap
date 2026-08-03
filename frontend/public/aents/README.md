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

`negative` is the horizontal lockup for dark backgrounds, which is what the
footer needs. It is served at 120 CSS px wide (the minimum the brand rules allow
for the full lockup) from a 240 px master, so it stays sharp on 2x screens.

To update: copy the file again from the monorepo. If a smaller mark is ever
needed, the rules require the symbol alone below 120 px, not a shrunken lockup —
use `packages/brand/exports/symbol-negative/` instead.
