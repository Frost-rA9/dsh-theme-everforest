#!/usr/bin/env node
/**
 * Validator for the Everforest theme pack.
 *
 * Checks, in order:
 *   1. bundle manifest and Cordis patch sanity,
 *   2. that `client.js` exposes its generator (loaded with a shimmed `window`,
 *      so no browser and no DSH runtime is needed),
 *   3. token coverage against the vendored base token list,
 *   4. that every generated value is a plausible CSS colour / gradient,
 *   5. WCAG contrast on the surfaces that carry text.
 *
 * Usage:
 *   node tools/check.mjs
 *   node tools/check.mjs --extract --from <path to @deepseek-ai/dsh-client-ui-theme>
 *
 * `--extract` re-reads the installed Harness theme bundle and rewrites
 * `tools/base-tokens.json`; the static-token list is harvested from every
 * installed package that reads `var(--dsw-static-…)` outside the theme bundle.
 * Nothing outside this package is written.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const BASE_TOKENS_PATH = join(HERE, 'base-tokens.json')
const CLIENT_PATH = join(ROOT, 'client.js')
const MAX_ICON_BYTES = 256 * 1024

const argv = process.argv.slice(2)
const argOf = (name) => {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

let failures = 0
const fail = (message) => {
  failures += 1
  console.error(`  FAIL  ${message}`)
}
const pass = (message) => console.log(`  ok    ${message}`)
const heading = (title) => console.log(`\n${title}`)

// ---------------------------------------------------------------------------
// extraction (development-time; regenerates tools/base-tokens.json)
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(js|mjs|cjs|css)$/.test(entry.name)) out.push(path)
  }
  return out
}

function extract(themeDir) {
  const client = join(themeDir, 'lib', 'client.js')
  if (!existsSync(client)) throw new Error(`no built client bundle at ${client}`)
  const text = readFileSync(client, 'utf8')
  const names = (re) => [...new Set([...text.matchAll(re)].map((m) => m[1]))]
  const packagesDir = dirname(themeDir)
  const staticNames = new Set()
  for (const path of walk(packagesDir)) {
    if (path.startsWith(themeDir)) continue
    for (const match of readFileSync(path, 'utf8').matchAll(/var\((--dsw-static-[a-z0-9-]+)/g)) {
      staticNames.add(match[1])
    }
  }
  // Deliberately machine-independent: the committed list must not carry the
  // local installation path, and re-running --extract must not reintroduce it.
  const origin = `${basename(themeDir)}/lib/client.js`
  return {
    generatedFrom: origin,
    layers: {
      alias: names(/(--dsw-alias-[a-z0-9-]+)(?=:)/g).sort(),
      specific: names(/(--dsw-specific-[a-z0-9-]+)(?=:)/g).sort(),
      chrome: names(/(--dsw-(?:menu-surface-fill|linear-[a-z0-9-]+))(?=:)/g).sort(),
      syntax: names(/(--shiki-[a-z0-9-]+)(?=:)/g).sort(),
      static: [...staticNames].sort(),
    },
  }
}

// ---------------------------------------------------------------------------
// colour maths
// ---------------------------------------------------------------------------

function parseColor(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value)
  if (hex) {
    const int = parseInt(hex[1], 16)
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value)
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])]
  return undefined
}

function luminance([r, g, b]) {
  const channel = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const la = luminance(parseColor(a))
  const lb = luminance(parseColor(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// ---------------------------------------------------------------------------
// checks
// ---------------------------------------------------------------------------

function loadGenerator() {
  const state = { window: { __ModuleLoader__: { load() {} } } }
  globalThis.window = state.window
  return import(pathToFileURL(CLIENT_PATH).href).then(() => state.window.__DSH_EVERFOREST__)
}

function checkManifest() {
  heading('manifest')
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const patchPath = manifest.dsh?.bundle?.patch
  const patch = patchPath ? readFileSync(join(ROOT, patchPath), 'utf8') : ''
  const inserted = [...patch.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1])

  if (manifest.dsh?.bundle?.patch) pass('dsh.bundle.patch declared')
  else fail('dsh.bundle.patch missing')
  if (manifest.dsh?.client?.platform === 'web') pass('dsh.client.platform = web')
  else fail('dsh.client.platform must be "web"')
  if (manifest.dsh?.client?.immediately === true) pass('client module loads immediately')
  else fail('dsh.client.immediately must be true so the palette applies at boot')
  const themeDependency = '@deepseek-ai/dsh-client-ui-theme'
  if ((manifest.dsh?.client?.inject ?? []).includes(themeDependency)) pass(`client waits for ${themeDependency}`)
  else fail(`dsh.client.inject must list ${themeDependency}`)
  if (manifest.exports?.['./client'] === './client.js') pass('./client export declared')
  else fail('exports["./client"] must point at ./client.js')
  if (inserted.length === 1 && inserted[0] === manifest.name) pass(`patch inserts one row for ${manifest.name}`)
  else fail(`patch must insert exactly one row named ${manifest.name} (found ${JSON.stringify(inserted)})`)

  for (const file of ['locale/en.json', 'locale/zh.json']) {
    const meta = JSON.parse(readFileSync(join(ROOT, file), 'utf8')).meta
    if (meta?.title && meta?.description) pass(`${file} carries meta.title/description`)
    else fail(`${file} must carry meta.title and meta.description`)
  }

  const icon = manifest.icon ? join(ROOT, manifest.icon.replace(/^\.\//, '')) : undefined
  if (icon && existsSync(icon)) {
    const size = statSync(icon).size
    if (size <= MAX_ICON_BYTES) pass(`icon.svg is ${size} bytes`)
    else fail(`icon exceeds ${MAX_ICON_BYTES} bytes`)
  } else fail('icon file missing')
}

function checkCoverage(generator, base) {
  heading('token coverage')
  const actual = generator.buildLayer('medium')
  const actualKeys = new Set(Object.keys(actual))
  const required = Object.values(base.layers).flat()
  const missing = required.filter((name) => !actualKeys.has(name))
  const unknown = [...actualKeys].filter((name) => !required.includes(name))

  console.log(`  ${required.length} base tokens, ${actualKeys.size} generated keys`)
  if (missing.length) fail(`unmapped base tokens: ${missing.join(', ')}`)
  else pass('every base token is mapped')
  if (unknown.length) fail(`keys the base sheet does not define: ${unknown.join(', ')}`)
  else pass('no stray keys')
}

function checkValues(generator, base) {
  heading('generated values')
  const gradientKeys = new Set(base.layers.chrome.filter((name) => name.startsWith('--dsw-linear-')))
  let bad = 0
  for (const depth of generator.DEPTHS) {
    const layer = generator.buildLayer(depth)
    for (const [name, modes] of Object.entries(layer)) {
      for (const scheme of ['light', 'dark']) {
        const value = modes[scheme]
        if (typeof value !== 'string' || value.length === 0) {
          fail(`${depth}/${scheme} ${name} is empty`)
          bad += 1
        } else if (gradientKeys.has(name)) {
          if (!value.startsWith('linear-gradient(')) {
            fail(`${depth}/${scheme} ${name} must be a gradient, got ${value}`)
            bad += 1
          }
        } else if (value !== 'transparent' && !parseColor(value)) {
          fail(`${depth}/${scheme} ${name} is not a colour: ${value}`)
          bad += 1
        }
      }
    }
  }
  if (!bad) pass(`all values across ${generator.DEPTHS.length} depths are valid CSS colours/gradients`)
}

function checkContrast(generator) {
  heading('contrast (WCAG 2.x)')
  const pairs = [
    ['base', 'body text on base surface', '--dsw-alias-label-primary', '--dsw-alias-bg-base', 4.5],
    ['raised', 'body text on raised surface', '--dsw-alias-label-primary', '--dsw-alias-bg-layer-2', 4.0],
    ['sidebar', 'body text on sidebar', '--dsw-alias-label-primary', '--dsw-specific-sidebar-fill', 4.0],
    ['2nd', 'secondary text on base', '--dsw-alias-label-secondary', '--dsw-alias-bg-base', 3.5],
    ['3rd', 'tertiary text on base', '--dsw-alias-label-tertiary', '--dsw-alias-bg-base', 2.5],
    ['caption', 'caption text on base', '--dsw-alias-label-caption', '--dsw-alias-bg-base', 2.5],
    ['on-brand', 'text on brand fill', '--dsw-alias-label-primary-foreground', '--dsw-alias-brand-primary', 3.0],
  ]
  let bad = 0
  console.log(`  ${'palette'.padEnd(14)}${pairs.map(([short]) => short.padEnd(9)).join('')}`)
  for (const depth of generator.DEPTHS) {
    const layer = generator.buildLayer(depth)
    for (const scheme of ['light', 'dark']) {
      const report = []
      for (const [, label, fgToken, bgToken, min] of pairs) {
        const fg = layer[fgToken]?.[scheme]
        const bg = layer[bgToken]?.[scheme]
        if (!fg || !bg) {
          fail(`${depth}/${scheme} missing ${fgToken} or ${bgToken}`)
          bad += 1
          continue
        }
        const ratio = contrast(fg, bg)
        if (ratio + 0.01 < min) {
          fail(`${depth}/${scheme} ${label} = ${ratio.toFixed(2)}:1 (min ${min})`)
          bad += 1
        }
        report.push(ratio.toFixed(2).padEnd(9))
      }
      console.log(`  ${`${scheme}-${depth}`.padEnd(14)}${report.join('')}`)
    }
  }
  if (!bad) pass('every palette clears its thresholds')
}

// ---------------------------------------------------------------------------

async function main() {
  const from = argOf('--from') ?? process.env.DSH_CLIENT_UI_THEME
  if (argv.includes('--extract')) {
    if (!from) {
      console.error('usage: node tools/check.mjs --extract --from <path to @deepseek-ai/dsh-client-ui-theme>')
      process.exit(2)
    }
    const extracted = extract(resolve(from))
    writeFileSync(BASE_TOKENS_PATH, `${JSON.stringify(extracted, null, 2)}\n`)
    const counts = Object.fromEntries(
      Object.entries(extracted.layers).map(([key, list]) => [key, list.length]),
    )
    console.log(`wrote ${BASE_TOKENS_PATH}`)
    console.log(JSON.stringify(counts, null, 2))
    return
  }

  if (!existsSync(BASE_TOKENS_PATH)) {
    console.error(`missing ${BASE_TOKENS_PATH}; run with --extract --from <theme package>`)
    process.exit(2)
  }
  const base = JSON.parse(readFileSync(BASE_TOKENS_PATH, 'utf8'))
  const generator = await loadGenerator()
  if (!generator?.buildLayer) {
    console.error('client.js did not expose window.__DSH_EVERFOREST__.buildLayer')
    process.exit(2)
  }

  checkManifest()
  checkCoverage(generator, base)
  checkValues(generator, base)
  checkContrast(generator)

  heading('result')
  if (failures) {
    console.error(`  ${failures} check(s) failed`)
    process.exit(1)
  }
  console.log('  all checks passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(2)
})
