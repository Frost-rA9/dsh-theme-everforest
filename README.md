# Everforest for the Harness web interface

Six complete [Everforest](https://github.com/sainnhe/everforest) palettes for the Harness web interface. A palette has a *depth* (hard, medium or soft) and a *plane* (light or dark); the picker in Settings → General chooses the depth, and the Appearance setting chooses the plane.

The pack is a Harness client plugin bundle: one host row with no behavior of its own, and one self-contained browser module that owns the palette token layer and the settings row.

| | |
| --- | --- |
| Package | `@local/dsh-theme-everforest` |
| Client entry | `client.js` (`window.__ModuleLoader__.load`) |
| Palette surface | `ctx.theme.overrideTokens('@local/dsh-theme-everforest', …)` |
| Settings row | `settings.general.item`, id `everforest`, order 13 |
| Persistence | `localStorage['dsh-theme-everforest.depth']` |
| Tokens covered | 154 (every base-sheet alias, specific and themed-chrome token, plus syntax) |

## Install

From a Harness session, install the bundle with the plugin manager:

```text
plugin_manager install_bundle
  target: /absolute/path/to/dsh-theme-everforest
```

The target must be the absolute path of a clone of this repository.

You can also install it from the Plugin Manager page in the web interface by pointing at this directory. The bundle declares no dependencies and no install scripts.

After installing, open Settings → General → Everforest and pick a depth. Refresh the page the first time the bundle appears.

## Choose a palette

The row offers seven choices, and each one sets both the depth and the host theme preference:

| Choice | What it does |
| --- | --- |
| Default | Removes the Everforest layer, and the built-in Harness palette returns |
| Dark Hard / Medium / Soft | Everforest’s dark planes, and pins Appearance to Dark |
| Light Hard / Medium / Soft | Everforest’s light planes, and pins Appearance to Light |

Choosing a variant sets two things: the depth, which this browser keeps in `localStorage` and defaults to `medium` on first run, and the host theme preference through `ctx.theme.setTheme`. The installed token layer carries a value for both schemes, so the three Appearance choices (Light, Dark, System) keep working and decide which half of the layer paints. Select System with a depth and the page follows the operating system, painting Light Medium by day and Dark Medium at night.

Depth is a per-browser choice. The theme service persists only the three built-in preferences, and this pack deliberately declares no host `Config`, which would add a build-time dependency to a plugin that needs none.

## Repository layout

The bundle is a single host row plus one browser module, with the checks and the palettes documented alongside:

```text
client.js               palette data, token rules, token layer, settings row
index.js                host half (no behavior)
cordis.patch.yml        inserts the single loader row
icon.svg                Plugin Manager artwork
locale/{en,zh}.json     Plugin Manager title and description
tools/check.mjs         coverage, color, contrast and manifest validator
tools/base-tokens.json  vendored base token list, from the Harness theme bundle
docs/PALETTE.md         upstream palette provenance and the six planes
docs/MAPPING.md         token group to palette slot rules, and contrast tuning
```

## Run the checks

The repository ships no build step; you’ll only need these commands:

```sh
node --check client.js          # browser half syntax
node --check index.js           # host half syntax
node tools/check.mjs            # full validation, non-zero exit on failure
```

`tools/check.mjs` loads `client.js` with a shimmed `window` and validates the *generated* layers: token coverage against `tools/base-tokens.json`, color validity, and text contrast on the base, raised and sidebar surfaces in all six palettes. The contrast checks use the WCAG (Web Content Accessibility Guidelines) thresholds recorded in `docs/MAPPING.md`.

Regenerate the vendored base token list after a Harness upgrade changes its theme bundle:

```sh
THEME_PACKAGE=@deepseek-ai/dsh-client-ui-theme
DSH_LIB="$(dirname "$(readlink -f "$(command -v dsh)")")/../node_modules"
node tools/check.mjs --extract \
  --from "$DSH_LIB/@deepseek-ai/dsh/node_modules/@deepseek-ai/$THEME_PACKAGE"
```

The extractor reads `lib/client.js` in that package for the `--dsw-alias-*`, `--dsw-specific-*`, themed chrome and `--shiki-*` names, and scans the surrounding packages for `var(--dsw-static-*)` reads, so the static patch list tracks what components consume.

## Known limits

Four limits are worth knowing before you install it:

- **First-paint flash**: The Harness boot stylesheet colors the canvas from the durable scheme before any plugin runs, so the Everforest background appears once this browser module loads. It’s cosmetic, and unavoidable for a per-browser choice.
- **The layer is a default, not an override**: Components that shade a token on a deeper selector, such as the Plugin Manager destructive button, keep their own color.
- **Untouched properties**: `--dsw-focus-ring-color` (interaction behavior), shadows, radii and fonts stay as they are. `--dsw-static-neutral-00` and `--dsw-static-neutral-bluish-00` stay pure white, because their consumers use them as a translucent white highlight.
- **Per-browser depth**: The choice lives in this browser origin and does not sync through the profile settings document.

## License

MIT. Palette values and the syntax mapping derive from [Everforest](https://github.com/sainnhe/everforest) by sainnhe (MIT); see `LICENSE` and `docs/PALETTE.md`.
