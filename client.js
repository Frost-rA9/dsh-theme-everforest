/**
 * Everforest theme pack for the Harness Web UI — browser half.
 *
 * The pack is a token *layer*, not a registered theme: it calls
 * `ctx.theme.overrideTokens(source, tokens)` with a `{ light, dark }` value for
 * every colour token the Harness base sheets define, so the host's own
 * light/dark/system preference keeps deciding which half paints. That keeps all
 * six Everforest palettes — hard, medium and soft depth, each in a light and a
 * dark plane — reachable while the Appearance row stays authoritative.
 *
 * It renders its own preference row into `settings.general.item` (the theme
 * feature owns its settings surface) and persists the chosen depth in
 * localStorage, because the theme service only persists the three built-in
 * preferences.
 *
 * Palette provenance: https://github.com/sainnhe/everforest (MIT), file
 * `autoload/everforest.vim` (`everforest#get_palette`) and `colors/everforest.vim`
 * (syntax groups). See docs/PALETTE.md.
 *
 * The module is one self-contained script — the client module system loads a
 * bundle without allowing a synchronous relative require — and it can be
 * `import`ed by tools/check.mjs with a shimmed `window`, which is what the
 * `window.__DSH_EVERFOREST__` handle below is for.
 */
;(function () {
  // #region palette data -----------------------------------------------------

  /** Accent plane: identical across hard/medium/soft within one scheme. */
  var ACCENTS = {
    dark: {
      fg: '#d3c6aa',
      red: '#e67e80',
      orange: '#e69875',
      yellow: '#dbbc7f',
      green: '#a7c080',
      aqua: '#83c092',
      blue: '#7fbbb3',
      purple: '#d699b6',
      grey0: '#7a8478',
      grey1: '#859289',
      grey2: '#9da9a0',
      statusline1: '#a7c080',
      statusline2: '#d3c6aa',
      statusline3: '#e67e80',
    },
    light: {
      fg: '#5c6a72',
      red: '#f85552',
      orange: '#f57d26',
      yellow: '#dfa000',
      green: '#8da101',
      aqua: '#35a77c',
      blue: '#3a94c5',
      purple: '#df69ba',
      grey0: '#a6b0a0',
      grey1: '#939f91',
      grey2: '#829181',
      statusline1: '#93b259',
      statusline2: '#708089',
      statusline3: '#e66868',
    },
  }

  /**
   * Background plane per depth and scheme, ordered:
   * bg_dim, bg0..bg5, bg_visual, bg_red, bg_yellow, bg_green, bg_blue, bg_purple.
   * A higher `bg` index always means "further from the base surface" — lighter
   * in the dark planes, darker in the light planes — so one rule table serves
   * both schemes.
   */
  var BG_SLOTS = [
    'bg_dim', 'bg0', 'bg1', 'bg2', 'bg3', 'bg4', 'bg5',
    'bg_visual', 'bg_red', 'bg_yellow', 'bg_green', 'bg_blue', 'bg_purple',
  ]
  var BACKGROUNDS = {
    dark: {
      hard: ['#1e2326', '#272e33', '#2e383c', '#374145', '#414b50', '#495156', '#4f5b58', '#4c3743', '#493b40', '#45443c', '#3c4841', '#384b55', '#463f48'],
      medium: ['#232a2e', '#2d353b', '#343f44', '#3d484d', '#475258', '#4f585e', '#56635f', '#543a48', '#514045', '#4d4c43', '#425047', '#3a515d', '#4a444e'],
      soft: ['#293136', '#333c43', '#3a464c', '#434f55', '#4d5960', '#555f66', '#5d6b66', '#5c3f4f', '#59464c', '#55544a', '#48584e', '#3f5865', '#4e4953'],
    },
    light: {
      hard: ['#f2efdf', '#fffbef', '#f8f5e4', '#f2efdf', '#edeada', '#e8e5d5', '#bec5b2', '#f0f2d4', '#ffe7de', '#fef2d5', '#f3f5d9', '#ecf5ed', '#fceced'],
      medium: ['#efebd4', '#fdf6e3', '#f4f0d9', '#efebd4', '#e6e2cc', '#e0dcc7', '#bdc3af', '#eaedc8', '#fde3da', '#faedcd', '#f0f1d2', '#e9f0e9', '#fae8e2'],
      soft: ['#e5dfc5', '#f3ead3', '#eae4ca', '#e5dfc5', '#ddd8be', '#d8d3ba', '#b9c0ab', '#e1e4bd', '#fadbd0', '#f1e4c5', '#e5e6c5', '#e1e7dd', '#f1ddd4'],
    },
  }
  var DEPTHS = ['hard', 'medium', 'soft']
  var SCHEMES = ['light', 'dark']

  /** Text weights: how far a label is mixed towards the base surface. */
  var TEXT_WEIGHTS = {
    light: { secondary: 0.12, primaryDimmed: 0.3, tertiary: 0.3, caption: 0.3, dimmed: 0.55, menuIcon: 0.15, punctuation: 0.15 },
    dark: { secondary: 0.2, primaryDimmed: 0.25, tertiary: 0.38, caption: 0.38, dimmed: 0.6, menuIcon: 0.15, punctuation: 0.15 },
  }

  function plane(depth, scheme) {
    var merged = { scheme: scheme, depth: depth }
    var accents = ACCENTS[scheme]
    for (var key in accents) merged[key] = accents[key]
    var backgrounds = BACKGROUNDS[scheme][depth]
    for (var index = 0; index < BG_SLOTS.length; index += 1) merged[BG_SLOTS[index]] = backgrounds[index]
    return merged
  }

  var PLANES = {}
  for (var depthIndex = 0; depthIndex < DEPTHS.length; depthIndex += 1) {
    for (var schemeIndex = 0; schemeIndex < SCHEMES.length; schemeIndex += 1) {
      var depthName = DEPTHS[depthIndex]
      var schemeName = SCHEMES[schemeIndex]
      PLANES[schemeName + '-' + depthName] = plane(depthName, schemeName)
    }
  }

  // #region colour helpers ---------------------------------------------------

  function channels(value) {
    var hex = /^#([0-9a-f]{6})$/i.exec(value)
    var int = parseInt(hex[1], 16)
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  }

  function hex(values) {
    return '#' + values.map(function (value) {
      return Math.round(value).toString(16).padStart(2, '0')
    }).join('')
  }

  /** Translucent form of an opaque palette colour. */
  function alpha(color, opacity) {
    var rgb = channels(color)
    return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + opacity + ')'
  }

  /** Blend `ratio` of `other` into `color` (sRGB, good enough for flat UI). */
  function mix(color, other, ratio) {
    var a = channels(color)
    var b = channels(other)
    return hex([
      a[0] + (b[0] - a[0]) * ratio,
      a[1] + (b[1] - a[1]) * ratio,
      a[2] + (b[2] - a[2]) * ratio,
    ])
  }

  function mask(palette, lightOpacity, darkOpacity) {
    return 'rgba(0, 0, 0, ' + (palette.scheme === 'light' ? lightOpacity : darkOpacity) + ')'
  }

  function tone(palette, weight) {
    return mix(palette.fg, palette.bg0, TEXT_WEIGHTS[palette.scheme][weight])
  }

  /**
   * Primary fill. The light planes deepen Everforest's green a little so a
   * cream label stays legible on a primary button (upstream paints cream on the
   * raw green, which lands under 3:1); the dark planes use the green as-is.
   */
  function brandFill(palette) {
    return palette.scheme === 'light' ? mix(palette.green, '#000000', 0.18) : palette.green
  }

  // #region token rules ------------------------------------------------------

  /* token-map:start */
  /** Base-sheet colour tokens: alias layer, specific layer, and themed chrome. */
  var TOKEN_RULES = {
    // surfaces
    '--dsw-alias-bg-base': function (p) { return p.bg0 },
    '--dsw-alias-bg-layer-1': function (p) { return p.bg1 },
    '--dsw-alias-bg-layer-2': function (p) { return p.bg2 },
    '--dsw-alias-bg-layer-3': function (p) { return p.bg3 },
    '--dsw-alias-bg-overlay': function (p) { return p.bg2 },
    '--dsw-alias-bg-document-preview': function (p) { return p.bg_dim },
    '--dsw-alias-bg-document-selection': function (p) { return alpha(p.blue, 0.35) },
    '--dsw-alias-bg-module-platform': function (p) { return p.bg1 },
    '--dsw-alias-bg-multi-select': function (p) { return p.bg_visual },
    '--dsw-alias-bg-skeleton': function (p) { return alpha(p.fg, 0.06) },
    '--dsw-alias-bg-mask-1': function (p) { return mask(p, 0.24, 0.5) },
    '--dsw-alias-bg-mask-2': function (p) { return mask(p, 0.12, 0.2) },
    '--dsw-alias-bg-mask-3': function (p) { return mask(p, 0.48, 0.48) },
    '--dsw-alias-bg-mask-drop': function (p) { return p.scheme === 'light' ? alpha('#ffffff', 0.7) : alpha(p.bg0, 0.7) },
    '--dsw-alias-bg-mask-photo': function (p) { return mask(p, 0.88, 0.88) },
    // borders
    '--dsw-alias-border-l1': function (p) { return alpha(p.fg, 0.1) },
    '--dsw-alias-border-l2': function (p) { return alpha(p.fg, 0.16) },
    '--dsw-alias-border-l2-darkmode-thin': function (p) { return alpha(p.fg, 0.1) },
    '--dsw-alias-border-l3': function (p) { return alpha(p.fg, 0.22) },
    '--dsw-alias-border-l4': function (p) { return alpha(p.fg, 0.3) },
    '--dsw-alias-border-inverted': function (p) { return p.scheme === 'light' ? 'transparent' : alpha(p.fg, 0.06) },
    '--dsw-alias-border-inverted2': function (p) { return p.scheme === 'light' ? 'transparent' : alpha(p.fg, 0.06) },
    // labels
    '--dsw-alias-label-primary': function (p) { return p.fg },
    '--dsw-alias-label-secondary': function (p) { return tone(p, 'secondary') },
    '--dsw-alias-label-tertiary': function (p) { return tone(p, 'tertiary') },
    '--dsw-alias-label-caption': function (p) { return tone(p, 'caption') },
    '--dsw-alias-label-dimmed': function (p) { return tone(p, 'dimmed') },
    '--dsw-alias-label-primary-dimmed': function (p) { return tone(p, 'primaryDimmed') },
    '--dsw-alias-label-primary-inverted': function (p) { return p.bg0 },
    '--dsw-alias-label-primary-foreground': function (p) { return p.bg0 },
    '--dsw-alias-label-primary-bluish': function (p) { return p.blue },
    '--dsw-alias-label-document-preview': function (p) { return tone(p, 'secondary') },
    '--dsw-alias-label-deep-diving': function (p) { return p.aqua },
    '--dsw-alias-label-deep-diving-shimmer': function (p) { return alpha(p.aqua, 0.5) },
    '--dsw-alias-label-shimmer': function (p) { return alpha(p.fg, 0.3) },
    '--dsw-alias-menu-icon': function (p) { return tone(p, 'menuIcon') },
    '--dsw-alias-link': function (p) { return p.blue },
    // brand
    '--dsw-alias-brand-primary': function (p) { return brandFill(p) },
    '--dsw-alias-brand-primary-invert': function (p) { return p.bg0 },
    '--dsw-alias-brand-primary-new-colorprimary-new-color': function (p) { return brandFill(p) },
    '--dsw-alias-brand-text': function (p) { return p.bg0 },
    // buttons
    '--dsw-alias-button-primary-fill': function (p) { return brandFill(p) },
    '--dsw-alias-button-primary-hover': function (p) { return mix(brandFill(p), p.fg, 0.15) },
    '--dsw-alias-button-primary-dimmed': function (p) { return alpha(p.green, 0.22) },
    '--dsw-alias-button-contrast-fill': function (p) { return mix(p.fg, p.bg0, 0.05) },
    '--dsw-alias-button-elevated-fill': function (p) { return p.bg1 },
    '--dsw-alias-button-floating-fill': function (p) { return p.bg1 },
    '--dsw-alias-button-floating-hover': function (p) { return p.bg2 },
    '--dsw-alias-button-ghost-active-fill': function (p) { return p.bg2 },
    '--dsw-alias-button-ghost-active-hover': function (p) { return p.bg3 },
    '--dsw-alias-button-ghost-active-border': function (p) { return mix(p.fg, p.bg0, 0.35) },
    '--dsw-alias-button-info-fill': function (p) { return p.blue },
    '--dsw-alias-button-info-hover': function (p) { return mix(p.blue, p.fg, 0.15) },
    '--dsw-alias-button-tool-bar-fill': function (p) { return alpha(p.fg, 0.2) },
    '--dsw-alias-button-tool-bar-fill-invisible': function (p) { return alpha(p.fg, 0.08) },
    '--dsw-alias-button-tool-bar-hover': function (p) { return alpha(p.fg, 0.28) },
    // interaction
    '--dsw-alias-interactive-bg-hover': function (p) { return alpha(p.fg, 0.06) },
    '--dsw-alias-interactive-bg-active': function (p) { return alpha(p.fg, 0.1) },
    '--dsw-alias-interactive-bg-hover-solid': function (p) { return p.bg2 },
    '--dsw-alias-interactive-bg-hover-accent': function (p) { return alpha(p.green, 0.12) },
    '--dsw-alias-interactive-bg-hover-danger': function (p) { return alpha(p.red, 0.1) },
    // states
    '--dsw-alias-state-error-primary': function (p) { return p.red },
    '--dsw-alias-state-error-secondary': function (p) { return mix(p.red, p.fg, 0.25) },
    '--dsw-alias-state-success-primary': function (p) { return p.green },
    '--dsw-alias-state-success-secondary': function (p) { return p.aqua },
    '--dsw-alias-state-success-tertiary': function (p) { return alpha(p.green, 0.18) },
    '--dsw-alias-state-warn-primary': function (p) { return p.yellow },
    '--dsw-alias-state-warn-secondary': function (p) { return p.orange },
    '--dsw-alias-state-warn-label': function (p) { return mix(p.yellow, p.fg, 0.15) },
    '--dsw-alias-state-warn-tertiary': function (p) { return alpha(p.yellow, 0.18) },
    '--dsw-alias-state-idle-primary': function (p) { return p.grey0 },
    '--dsw-alias-state-business-primary': function (p) { return p.aqua },
    '--dsw-alias-state-business-tertiary': function (p) { return alpha(p.aqua, 0.18) },
    // markdown and code
    '--dsw-alias-markdown-code-block': function (p) { return p.bg_dim },
    '--dsw-alias-markdown-code-block-banner': function (p) { return p.bg1 },
    '--dsw-alias-markdown-code-segment-selected': function (p) { return p.bg2 },
    '--dsw-alias-markdown-code-segment-unselected': function (p) { return p.bg1 },
    '--dsw-alias-markdown-inline-code': function (p) { return p.bg1 },
    '--dsw-alias-markdown-placeholder': function (p) { return p.bg2 },
    '--dsw-alias-markdown-tag': function (p) { return p.bg1 },
    '--dsw-alias-markdown-citation': function (p) { return p.bg1 },
    // diffs
    '--dsw-alias-code-diff-added': function (p) { return alpha(p.green, 0.15) },
    '--dsw-alias-code-diff-deleted': function (p) { return alpha(p.red, 0.15) },
    '--dsw-alias-file-diff-added-bg': function (p) { return p.bg_green },
    '--dsw-alias-file-diff-added-gutter': function (p) { return mix(p.bg_green, p.bg0, 0.5) },
    '--dsw-alias-file-diff-added-marker': function (p) { return p.green },
    '--dsw-alias-file-diff-deleted-bg': function (p) { return p.bg_red },
    '--dsw-alias-file-diff-deleted-gutter': function (p) { return mix(p.bg_red, p.bg0, 0.5) },
    '--dsw-alias-file-diff-deleted-marker': function (p) { return p.red },
    // menus, tooltips, toasts, scrollbars
    '--dsw-alias-scrollbar-bg-l1': function (p) { return p.bg2 },
    '--dsw-alias-scrollbar-bg-l2': function (p) { return p.bg2 },
    '--dsw-alias-scrollbar-hover-l1': function (p) { return p.bg3 },
    '--dsw-alias-scrollbar-hover-l2': function (p) { return p.bg4 },
    '--dsw-alias-menu-group-header-fill': function (p) { return alpha(p.bg2, 0.98) },
    '--dsw-alias-toast-bg': function (p) { return p.bg2 },
    '--dsw-alias-toast-label': function (p) { return p.fg },
    '--dsw-alias-tooltip-bg': function (p) { return p.bg3 },
    '--dsw-alias-tooltip-key-bg': function (p) { return p.bg4 },
    '--dsw-alias-turn-trigger-bg': function (p) { return p.bg1 },
    '--dsw-alias-turn-trigger-bg-hover': function (p) { return p.bg2 },
    '--dsw-alias-switch-thumb': function (p) { return mix(p.fg, p.bg0, 0.1) },
    // settings and onboarding
    '--dsw-alias-settings-card-fill': function (p) { return p.bg2 },
    '--dsw-alias-settings-card-stroke': function (p) { return alpha(p.fg, 0.3) },
    '--dsw-alias-onboarding-accent': function (p) { return p.green },
    '--dsw-alias-onboarding-card-fill': function (p) { return alpha(p.bg2, 0.8) },
    '--dsw-alias-onboarding-secondary-fill': function (p) { return p.bg1 },
    '--dsw-alias-onboarding-checkbox-border': function (p) { return alpha(p.fg, 0.3) },
    // specific layer
    '--dsw-specific-bubble': function (p) { return p.bg1 },
    '--dsw-specific-bubble-highlight': function (p) { return p.bg2 },
    '--dsw-specific-input-major': function (p) { return p.bg1 },
    '--dsw-specific-login-input': function (p) { return p.bg0 },
    '--dsw-specific-selector': function (p) { return p.bg1 },
    '--dsw-specific-tip': function (p) { return p.bg1 },
    '--dsw-specific-menu': function (p) { return alpha(p.bg2, 0.95) },
    '--dsw-specific-sidebar-fill': function (p) { return p.bg_dim },
    '--dsw-specific-sidebar-nav-item-hover': function (p) { return alpha(p.fg, 0.07) },
    '--dsw-specific-sidebar-nav-item-active': function (p) { return p.bg_visual },
    '--dsw-specific-sidebar-nav-item-active-accent': function (p) { return alpha(p.green, 0.35) },
    // themed chrome outside the alias naming
    '--dsw-menu-surface-fill': function (p) { return alpha(p.bg2, 0.95) },
    '--dsw-linear-gradient-think': function (p) { return 'linear-gradient(180deg, ' + p.bg0 + ' 20.19%, transparent 100%)' },
    '--dsw-linear-think-select': function (p) { return 'linear-gradient(180deg, ' + p.bg1 + ' 20.19%, transparent 100%)' },
  }
  /* token-map:end */

  /* shiki-map:start */
  /** Syntax colours, following `colors/everforest.vim`'s highlight groups. */
  var SHIKI_RULES = {
    '--shiki-foreground': function (p) { return p.fg },
    '--shiki-background': function (p) { return p.bg_dim },
    '--shiki-token-constant': function (p) { return p.purple },
    '--shiki-token-string': function (p) { return p.green },
    '--shiki-token-string-expression': function (p) { return p.green },
    '--shiki-token-comment': function (p) { return p.grey1 },
    '--shiki-token-keyword': function (p) { return p.red },
    '--shiki-token-parameter': function (p) { return p.orange },
    '--shiki-token-function': function (p) { return p.green },
    '--shiki-token-punctuation': function (p) { return tone(p, 'punctuation') },
    '--shiki-token-link': function (p) { return p.blue },
  }
  /* shiki-map:end */

  /* static-map:start */
  /**
   * Static ramp entries that components read directly instead of through an
   * alias. Mapping them keeps stray DeepSeek blues out of an Everforest page.
   * `neutral-00` / `neutral-bluish-00` stay pure white: their only consumers
   * use them as a translucent white highlight.
   */
  var STATIC_RULES = {
    '--dsw-static-neutral-00': function () { return '#ffffff' },
    '--dsw-static-neutral-bluish-00': function () { return '#ffffff' },
    '--dsw-static-neutral-50': function (p) { return p.bg1 },
    '--dsw-static-neutral-100': function (p) { return p.bg2 },
    '--dsw-static-neutral-200': function (p) { return mix(p.fg, p.bg0, 0.4) },
    '--dsw-static-neutral-400': function (p) { return mix(p.fg, p.bg0, 0.5) },
    '--dsw-static-neutral-700': function (p) { return mix(p.fg, p.bg0, 0.22) },
    '--dsw-static-neutral-800': function (p) { return p.bg2 },
    '--dsw-static-neutral-850': function (p) { return p.bg1 },
    '--dsw-static-neutral-bluish-300': function (p) { return mix(p.fg, p.bg0, 0.45) },
    '--dsw-static-neutral-bluish-400': function (p) { return mix(p.fg, p.bg0, 0.38) },
    '--dsw-static-deepseek-400': function (p) { return mix(p.green, p.fg, 0.15) },
    '--dsw-static-deepseek-450': function (p) { return p.green },
    '--dsw-static-deepseek-500': function (p) { return p.green },
    '--dsw-static-blue-400': function (p) { return mix(p.blue, p.fg, 0.12) },
    '--dsw-static-blue-450': function (p) { return mix(p.blue, p.fg, 0.08) },
    '--dsw-static-blue-500': function (p) { return p.blue },
    '--dsw-static-blue-600': function (p) { return mix(p.blue, p.bg0, 0.15) },
    '--dsw-static-green-500': function (p) { return p.green },
    '--dsw-static-red-600': function (p) { return p.red },
    '--dsw-static-amber-400': function (p) { return mix(p.yellow, p.fg, 0.12) },
    '--dsw-static-amber-500': function (p) { return p.yellow },
  }
  /* static-map:end */

  /**
   * Build the override layer for one depth: every rule evaluated against both
   * schemes, which is the `{ light, dark }` shape `ctx.theme.overrideTokens`
   * requires.
   * @param depth - 'hard' | 'medium' | 'soft'.
   * @returns token name → per-scheme value.
   */
  function buildLayer(depth) {
    var planes = { light: plane(depth, 'light'), dark: plane(depth, 'dark') }
    var layer = {}
    var tables = [TOKEN_RULES, SHIKI_RULES, STATIC_RULES]
    for (var tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      var rules = tables[tableIndex]
      for (var name in rules) {
        if (!Object.prototype.hasOwnProperty.call(rules, name)) continue
        layer[name] = { light: rules[name](planes.light), dark: rules[name](planes.dark) }
      }
    }
    return layer
  }

  var SOURCE = '@local/dsh-theme-everforest'
  var NAMESPACE = 'settings.everforest'
  var STORAGE_KEY = 'dsh-theme-everforest.depth'
  var DEFAULT_DEPTH = 'medium'

  function readDepth() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'off' || DEPTHS.indexOf(stored) !== -1) return stored
    } catch (error) {
      /* storage unavailable (private mode, sandboxed frame): first-run default */
    }
    return DEFAULT_DEPTH
  }

  function writeDepth(depth) {
    try {
      window.localStorage.setItem(STORAGE_KEY, depth)
    } catch (error) {
      /* the choice still applies for this session */
    }
  }

  // Tooling handle for tools/check.mjs; no runtime code reads it back.
  window.__DSH_EVERFOREST__ = { SOURCE: SOURCE, DEPTHS: DEPTHS, SCHEMES: SCHEMES, PLANES: PLANES, buildLayer: buildLayer }

  // #region client module ----------------------------------------------------

  window.__ModuleLoader__.load({
    id: SOURCE,
    factory: function (require) {
      var React = require('react')
      var h = React.createElement

      var zh = {
        title: 'Everforest',
        hint: '「深度」同时作用于浅色与深色配色；切换浅色 / 深色请使用上方的「外观」。',
        default: '默认',
        defaultHint: '停用 Everforest，使用 Harness 自带配色',
        dark: '深色',
        light: '浅色',
        hard: '高对比',
        medium: '标准',
        soft: '柔和',
      }
      var en = {
        title: 'Everforest',
        hint: 'Depth applies to both the light and dark palettes; switch light / dark in Appearance above.',
        default: 'Default',
        defaultHint: 'Turn Everforest off and use the built-in Harness palette',
        dark: 'Dark',
        light: 'Light',
        hard: 'Hard',
        medium: 'Medium',
        soft: 'Soft',
      }

      // Chrome mirrors the host's settings rows: 16px vertical rhythm, a
      // hairline bottom border owned by the row itself, a 14/22 title with a
      // 12/18 description, and controls that fill with
      // `--dsw-alias-interactive-bg-hover` (inline styles cannot express
      // `:hover`, so the row tracks the hovered control in state).
      var rowStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '16px 0',
        borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
      }
      var headStyle = { display: 'flex', alignItems: 'center', gap: 8 }
      var textStyle = {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: 4,
        minWidth: 0,
        paddingRight: 48,
      }
      var titleStyle = {
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '22px',
      }
      var descStyle = {
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: '18px',
      }
      var groupsStyle = { display: 'flex', flexDirection: 'column', gap: 8 }
      var groupStyle = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
      var groupLabelStyle = {
        width: 34,
        flex: 'none',
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: 12,
        lineHeight: '18px',
      }
      var chipStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 11px 4px 5px',
        cursor: 'pointer',
        borderRadius: 'var(--dsw-radius-md, 8px)',
        border: '0.5px solid var(--dsw-alias-border-l4)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: 'inherit',
        fontSize: 14,
        lineHeight: '22px',
      }
      var plainChipStyle = Object.assign({}, chipStyle, { padding: '4px 11px' })
      var hoverStyle = { background: 'var(--dsw-alias-interactive-bg-hover)' }
      var selectedStyle = {
        background: 'var(--dsw-alias-bg-module-platform)',
        borderColor: 'var(--dsw-alias-brand-primary)',
      }
      var swatchStyle = {
        display: 'inline-flex',
        flexDirection: 'column',
        width: 16,
        height: 16,
        borderRadius: 4,
        overflow: 'hidden',
        border: '0.5px solid var(--dsw-alias-border-l4)',
        flex: 'none',
      }

      /** Selected wins; hover feedback applies only while unselected. */
      function chipState(selected, hovered) {
        if (selected) return selectedStyle
        return hovered ? hoverStyle : null
      }

      /** One depth choice: a three-band palette swatch plus its label. */
      function variantButton(t, state, select, hover, setHover, scheme, depth) {
        var id = scheme + '-' + depth
        var palette = PLANES[id]
        var selected = state.depth === depth && state.scheme === scheme
        var label = t('title') + ' ' + t(scheme) + ' ' + t(depth)
        return h('button', {
          key: id,
          type: 'button',
          'aria-pressed': selected,
          'aria-label': label,
          title: label,
          onClick: function () { select(scheme, depth) },
          onMouseEnter: function () { setHover(id) },
          onMouseLeave: function () { setHover(null) },
          style: Object.assign({}, chipStyle, chipState(selected, hover === id)),
        }, [
          h('span', { key: 'swatch', 'aria-hidden': true, style: swatchStyle }, [
            h('span', { key: 'surface', style: { flex: '1 1 0', background: palette.bg0 } }),
            h('span', { key: 'accent', style: { flex: '1 1 0', background: palette.green } }),
            h('span', { key: 'text', style: { flex: '1 1 0', background: palette.fg } }),
          ]),
          h('span', { key: 'label' }, t(depth)),
        ])
      }

      /** The Everforest preference row. */
      function EverforestRow(props) {
        // The slot's `locale` option supplies the bound translate seat; the
        // embedded dictionary is the fallback so a missing seat degrades the
        // copy instead of blanking the entry.
        var fallback = props.t ? null : en
        var t = props.t || function (key) { return fallback[key] || key }
        // Same reasoning for the injected face: an unexpected prop shape must
        // never take the General section down with it.
        var getState = props.getState || function () { return { depth: 'off', scheme: 'light' } }
        var subscribe = props.subscribe || function () { return function () {} }
        var select = props.select || function () {}
        var pair = React.useState(getState)
        var state = pair[0]
        var setState = pair[1]
        var hoverPair = React.useState(null)
        var hover = hoverPair[0]
        var setHover = hoverPair[1]
        React.useEffect(function () {
          return subscribe(function () { setState(getState()) })
        }, [subscribe, getState])

        var off = state.depth === 'off'
        var groups = SCHEMES.map(function (scheme) {
          return h('div', { key: scheme, style: groupStyle }, [
            h('span', { key: 'label', style: groupLabelStyle }, t(scheme)),
            DEPTHS.map(function (depth) {
              return variantButton(t, state, select, hover, setHover, scheme, depth)
            }),
          ])
        })
        return h('div', { style: rowStyle }, [
          h('div', { key: 'head', style: headStyle }, [
            h('div', { key: 'text', style: textStyle }, [
              h('span', { key: 'title', style: titleStyle }, t('title')),
              h('span', { key: 'desc', style: descStyle }, t('hint')),
            ]),
            h('button', {
              key: 'default',
              type: 'button',
              'aria-pressed': off,
              'aria-label': t('defaultHint'),
              title: t('defaultHint'),
              onClick: function () { select(null, 'off') },
              onMouseEnter: function () { setHover('default') },
              onMouseLeave: function () { setHover(null) },
              style: Object.assign({}, plainChipStyle, chipState(off, hover === 'default')),
            }, t('default')),
          ]),
          h('div', { key: 'groups', style: groupsStyle }, groups),
        ])
      }

      return {
        inject: ['slots', 'locale', 'theme'],
        apply: function (ctx) {
          var depth = readDepth()
          var scheme = ctx.theme.getTheme().active.colorScheme
          var disposeLayer = null
          var listeners = new Set()

          function notify() {
            listeners.forEach(function (listener) { listener() })
          }

          function getState() {
            return { depth: depth, scheme: scheme }
          }

          function subscribe(listener) {
            listeners.add(listener)
            return function () { listeners.delete(listener) }
          }

          /** Replace or drop the layer; `overrideTokens` re-registration replaces it in place. */
          function install(next) {
            if (disposeLayer) {
              disposeLayer()
              disposeLayer = null
            }
            if (next === 'off') return
            disposeLayer = ctx.theme.overrideTokens(SOURCE, buildLayer(next))
          }

          ctx.effect(function () {
            install(depth)
            return function () {
              if (disposeLayer) {
                disposeLayer()
                disposeLayer = null
              }
              listeners.clear()
            }
          }, 'everforest: palette token layer')

          ctx.on('theme/change', function (snapshot) {
            var next = snapshot.active.colorScheme
            if (next === scheme) return
            scheme = next
            notify()
          })

          ctx.effect(function () {
            return ctx.locale.register(NAMESPACE, { zh: zh, en: en })
          }, 'everforest: settings row dictionaries')

          ctx.slots.inject('settings.general.item', function () {
            return ctx.slots.register({
              name: 'settings.general.item',
              id: 'everforest',
              order: 13,
              locale: NAMESPACE,
              inject: function () {
                return {
                  getState: getState,
                  subscribe: subscribe,
                  select: function (nextScheme, nextDepth) {
                    depth = nextDepth
                    writeDepth(nextDepth)
                    install(nextDepth)
                    if (nextScheme) ctx.theme.setTheme(nextScheme)
                    notify()
                  },
                }
              },
            }, EverforestRow)
          })
        },
      }
    },
  })
})()
