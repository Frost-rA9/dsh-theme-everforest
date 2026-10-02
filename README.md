# dsh-theme-everforest

Six complete [Everforest](https://github.com/sainnhe/everforest) palettes for the
Harness Web UI — **hard**, **medium** and **soft** depth, each in a **light** and
a **dark** plane — with a picker in **Settings → General**.

The pack is a Harness Client plugin bundle: one Host row with no behaviour, and
one self-contained browser module that owns the palette token layer and the
settings row.

| | |
| --- | --- |
| Package | `@local/dsh-theme-everforest` |
| Client entry | `client.js` (`window.__ModuleLoader__.load`) |
| Palette surface | `ctx.theme.overrideTokens('@local/dsh-theme-everforest', …)` |
| Settings row | `settings.general.item`, id `everforest`, order 13 |
| Persistence | `localStorage['dsh-theme-everforest.depth']` |
| Tokens covered | 154 (every base-sheet alias, specific and themed-chrome token + syntax) |

## Install

From a Harness session with the DSH plugin manager:

```
plugin_manager install_bundle
  target: /absolute/path/to/dsh-theme-everforest
```

The target must be the absolute path of a clone of this repository.

Or install it from the Plugin Manager page in the Web UI by pointing at this
directory. The bundle declares no dependencies and no install scripts.

After installing, open **Settings → General → Everforest** and pick a depth.
A page refresh may be needed the first time the bundle appears.

## The seven choices

| Choice | What it does |
| --- | --- |
| **Default** | Removes the Everforest layer; the built-in Harness palette returns |
| **Dark Hard / Medium / Soft** | Everforest's dark planes; also pins Appearance to Dark |
| **Light Hard / Medium / Soft** | Everforest's light planes; also pins Appearance to Light |

Choosing a variant sets two things: the **depth** (kept in this browser's
`localStorage`, defaulting to `medium` on first run) and the host **theme
preference** through `ctx.theme.setTheme`. The installed token layer carries a
value for *both* schemes, so the three Appearance choices (Light / Dark /
System) keep working and simply decide which half of the layer paints. Select
System + a depth and the page follows the OS: Light Medium by day, Dark Medium
at night.

Depth is a per-browser choice: the theme service persists only the three
built-in preferences, and this pack deliberately declares no Host `Config`
(that would add a build-time dependency to a plugin that needs none).

## Layout

```
client.js              palette data, token rules, token layer, settings row
index.js               Host half (no behaviour)
cordis.patch.yml       inserts the single Loader row
icon.svg               Plugin Manager artwork
locale/{en,zh}.json    Plugin Manager title and description
tools/check.mjs        coverage / colour / contrast / manifest validator
tools/base-tokens.json vendored base token list (generated from the DSH bundle)
docs/PALETTE.md        upstream palette provenance and the six planes
docs/MAPPING.md        token group → palette slot rules and contrast tuning
```

## Development

```sh
node --check client.js          # browser half syntax
node --check index.js           # host half syntax
node tools/check.mjs            # full validation, non-zero exit on failure
```

`tools/check.mjs` loads `client.js` with a shimmed `window` and validates the
*generated* layers: token coverage against `tools/base-tokens.json`, CSS colour
validity, and WCAG contrast on the base, raised and sidebar surfaces in all six
palettes.

Regenerate the vendored base token list after a Harness upgrade that changes its
theme bundle:

```sh
node tools/check.mjs --extract \
  --from "$(dirname "$(readlink -f "$(command -v dsh)")")/../node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-theme"
```

The extractor reads `lib/client.js` in that package for the `--dsw-alias-*`,
`--dsw-specific-*`, themed chrome and `--shiki-*` names, and scans the
surrounding packages for `var(--dsw-static-*)` reads so the static patch list
tracks what components actually consume.

## Notes and limits

- **First-paint flash.** The Harness boot CSS colours the canvas from the
  durable scheme before any plugin runs; the Everforest background appears once
  this client module loads. Cosmetic, and unavoidable for a per-browser choice.
- **The layer is a default, not a cage.** Components that deliberately shade a
  token on a deeper selector (for example the Plugin Manager's destructive
  button) keep their own colour.
- **Untouched on purpose:** `--dsw-focus-ring-color` (interaction behaviour),
  shadows, radii, and fonts. `--dsw-static-neutral-00` and
  `--dsw-static-neutral-bluish-00` stay pure white because their consumers use
  them as a translucent white highlight.
- **Depth is per browser origin**, not synced through the profile settings
  document.

## License

MIT. Palette values and the syntax mapping are derived from
[Everforest](https://github.com/sainnhe/everforest) by sainnhe (MIT); see
`LICENSE` and `docs/PALETTE.md`.
