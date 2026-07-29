# Aents brand assets

Vendored from the Aents monorepo. **Do not edit, redraw, recolour or vectorise
these files.** They are exports of an approved master; regenerating them by
tracing a copy would fork the identity.

| File                       | Source                                                  |
| -------------------------- | ------------------------------------------------------- |
| `aents-negative-240.png`   | `packages/brand/exports/negative/negative-240.png`       |
| `aents-symbol.png`         | `apps/web/public/brand/symbol.png`                       |
| `aents-symbol-negative.png`| `apps/web/public/brand/symbol-negative.png`              |

`negative` is the horizontal lockup for dark backgrounds, which is what the
footer needs. It is served at 120 CSS px wide (the minimum the brand rules allow
for the full lockup) from a 240 px master, so it stays sharp on 2x screens.

To update: copy the file again from the monorepo. If a smaller mark is ever
needed, the rules require the symbol alone below 120 px, not a shrunken lockup —
use `packages/brand/exports/symbol-negative/` instead.
