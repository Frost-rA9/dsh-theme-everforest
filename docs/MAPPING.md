# Token mapping

How the six Everforest planes become Harness theme tokens. The authoritative
implementation is `client.js`; the tables here record the rules and the
reasoning so the mapping can be reviewed or re-derived.

## Mechanism

`client.js` calls

```js
ctx.theme.overrideTokens('@local/dsh-theme-everforest', buildLayer(depth))
```

`buildLayer` evaluates one rule per token against both schemes and returns the
`{ light, dark }` pair shape the theme service requires. `ThemeRuntime`
composes that layer over whichever theme is active, picks the value for the
resolved colour scheme, and the layout presenter writes the result as inline
custom properties on `document.body` — which is why plain `--dsw-static-*`
tokens can be themed alongside the `--dsw-alias-*` layer.

Coverage is checked, not asserted: `node tools/check.mjs` compares the keys of
`buildLayer('medium')` against `tools/base-tokens.json` and fails on both
missing and stray keys (154 tokens).

## Rule groups

`alpha(color, a)` → `rgba()`, `mix(a, b, t)` → sRGB hex blend, `tone(p, w)` →
`mix(fg, bg0, TEXT_WEIGHTS[scheme][w])`.

| Group | Rule |
| --- | --- |
| Base surface | `bg-base` → `bg0` |
| Raised surfaces | `bg-layer-1/2/3` → `bg1/bg2/bg3`; `bg-overlay` → `bg2` |
| Panels and chips | `bg-module-platform`, `specific-bubble`, `specific-input-major`, `specific-selector`, `specific-tip`, `markdown-inline-code`, `markdown-code-block-banner`, `markdown-citation`, `markdown-tag`, `turn-trigger-bg` → `bg1` |
| Nested panels | `specific-bubble-highlight`, `markdown-placeholder`, `markdown-code-segment-selected`, `turn-trigger-bg-hover`, `interactive-bg-hover-solid` → `bg2`; `bg-multi-select` → `bg_visual`; `markdown-code-segment-unselected` → `bg1` |
| Code block | `markdown-code-block` → `bg_dim` |
| Sidebar | `specific-sidebar-fill` → `bg_dim`; `-nav-item-hover` → `alpha(fg,.07)`; `-nav-item-active` → `bg_visual`; `-active-accent` → `alpha(green,.35)` |
| Selection and skeleton | `bg-document-selection` → `alpha(blue,.35)`; `bg-skeleton` → `alpha(fg,.06)` |
| Masks | `bg-mask-1/2/3` → `rgba(0,0,0, .24/.12/.48)` light, `.50/.20/.48` dark; `-photo` → `.88`; `-drop` → `rgba(255,255,255,.7)` light, `alpha(bg0,.7)` dark |
| Borders | `border-l1`, `l2`, `l2-darkmode-thin`, `l3`, `l4` → `alpha(fg, .10/.16/.10/.22/.30)`; `border-inverted{,2}` → `transparent` light, `alpha(fg,.06)` dark |
| Labels | see the text ladder below |
| Brand | `brand-primary` and `brand-primary-new-…` → `brandFill`; `brand-text`, `brand-primary-invert`, `label-primary-foreground`, `label-primary-inverted` → `bg0` |
| Buttons | primary fill → `brandFill`, hover → `mix(brandFill, fg, .15)`, dimmed → `alpha(green,.22)`; contrast → `mix(fg,bg0,.05)`; elevated/floating → `bg1`/`bg2`; ghost → `bg2`/`bg3`/`mix(fg,bg0,.35)`; info → `blue`; tool-bar → `alpha(fg, .20/.08/.28)` |
| Interaction | hover → `alpha(fg,.06)`, active → `alpha(fg,.10)`, accent → `alpha(green,.12)`, danger → `alpha(red,.10)` |
| States | error → `red` / `mix(red,fg,.25)`; success → `green` / `aqua` / `alpha(green,.18)`; warn → `yellow` / `orange` / `mix(yellow,fg,.15)` / `alpha(yellow,.18)`; idle → `grey0`; business → `aqua` / `alpha(aqua,.18)` |
| Diffs | `code-diff-added/deleted` → `alpha(green/red,.15)`; `file-diff-*-bg` → `bg_green`/`bg_red`, `-gutter` → `mix(·, bg0, .5)`, `-marker` → `green`/`red` |
| Menus, tips, toasts, scrollbars | menu surfaces → `alpha(bg2,.95/.98)`; icon → `tone(p,'menuIcon')`; toast → `bg2`; tooltip → `bg3`; tooltip key → `bg4`; scrollbar → `bg2`/`bg2`/`bg3`/`bg4` |
| Settings and onboarding | card fill → `bg2`, stroke → `alpha(fg,.30)`; onboarding accent → `green`, card fill → `alpha(bg2,.8)`, secondary fill → `bg1`, checkbox border → `alpha(fg,.30)` |
| Gradients | `linear-gradient-think` → `linear-gradient(180deg, bg0 20.19%, transparent 100%)`; `-think-select` → the same over `bg1` |
| Syntax | `constant` → `purple`, `string`/`string-expression`/`function` → `green`, `comment` → `grey1`, `keyword` → `red`, `parameter` → `orange`, `punctuation` → `tone(p,'punctuation')`, `link` → `blue`, `shiki-foreground/background` → `fg`/`bg_dim` |
| Static patch | `neutral-50/100 → bg1/bg2`; `neutral-800/850 → bg2/bg1`; `neutral-200/400/700` and `neutral-bluish-300/400` → the `mix(fg,bg0, ·)` grey ladder; `deepseek-*` and `green-500` → `green`; `blue-*` → `blue`; `red-600` → `red`; `amber-*` → `yellow`; `neutral-00` and `neutral-bluish-00` → `#ffffff` |

### Text ladder

| Token | Value |
| --- | --- |
| `label-primary` | `fg` |
| `label-secondary` | `tone(secondary)` — `mix(fg,bg0, .12)` light, `.20` dark |
| `label-tertiary`, `label-caption` | `tone(tertiary)` — `.30` light, `.38` dark |
| `label-primary-dimmed` | `.30` light, `.25` dark |
| `label-dimmed` | `.55` light, `.60` dark |
| `menu-icon` | `.15` both |
| `label-primary-bluish` | `blue` |
| `label-deep-diving` | `aqua`, its shimmer `alpha(aqua,.5)` |
| `label-shimmer` | `alpha(fg,.30)` |

## Deliberate deviations from upstream

1. **`brandFill` for the light planes.** Upstream paints cream (`bg0`) on the
   raw light green `#8da101`, which measures 2.7:1 — below any usable button
   label contrast. The light planes therefore deepen the green by 18 %
   (`#748400`) for `brand-primary` and `button-primary-fill` only; the dark
   planes, syntax colours, state colours and sidebar accent keep the exact
   upstream green.
2. **`tone()` instead of `grey1` for UI labels.** Everforest's `grey1` is a
   comment colour: 2.6:1 on the light base. UI labels use a controlled mix
   towards the base surface instead, so every palette clears its thresholds,
   while syntax comments keep the authentic `grey1`.
3. **Static patch.** Only the `--dsw-static-*` names that components actually
   read through `var()` are mapped (harvested by `tools/check.mjs --extract`);
   the rest of the static ramp is left alone, because every alias that used it
   is mapped directly. `neutral-00` / `neutral-bluish-00` stay white: their
   consumers use them as a translucent white highlight, and tinting them would
   invert that intent in the light planes.
4. **Untouched properties.** `--dsw-focus-ring-color` (default `transparent`;
   mapping it would change focus behaviour), shadows, radii, fonts, and
   `--dsw-mask-blur` / `--dsw-menu-backdrop-filter`.

## Contrast thresholds

`node tools/check.mjs` prints the measured ratios and fails the build below
these values:

| Pair | Minimum | Rationale |
| --- | --- | --- |
| `label-primary` on `bg-base` | 4.5 | body text, WCAG AA |
| `label-primary` on `bg-layer-2` | 4.0 | raised surfaces; Everforest's light-soft plane ships ~4.2:1 upstream |
| `label-primary` on `specific-sidebar-fill` | 4.0 | same palette limit |
| `label-secondary` on `bg-base` | 3.5 | secondary text |
| `label-tertiary` / `label-caption` on `bg-base` | 2.5 | metadata labels |
| `label-primary-foreground` on `brand-primary` | 3.0 | text on a primary button |

Current measurements:

```
palette       base     raised   sidebar  2nd      3rd      caption  on-brand
light-hard    5.40     4.84     4.84     4.19     2.92     2.92     4.02
dark-hard     8.15     6.20     9.39     5.83     4.11     4.11     6.88
light-medium  5.18     4.66     4.66     4.04     2.87     2.87     3.86
dark-medium   7.38     5.57     8.62     5.34     3.86     3.86     6.23
light-soft    4.66     4.17     4.17     3.73     2.72     2.72     3.47
dark-soft     6.65     4.99     7.83     4.87     3.61     3.61     5.62
```
