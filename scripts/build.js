import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const base = JSON.parse(readFileSync(join(root, 'manifest.base.json'), 'utf-8'))

const MANIFESTS = {
  chrome: {
    ...base,
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
  },
  firefox: {
    ...base,
    background: {
      scripts: ['background.js'],
      type: 'module',
    },
    browser_specific_settings: {
      gecko: {
        id: 'cookie-transfer@extension',
        strict_min_version: '109.0',
      },
    },
  },
}

const browser = process.argv[2] ?? 'chrome'

if (!Object.hasOwn(MANIFESTS, browser)) {
  console.error(`Unknown browser: "${browser}". Use "chrome" or "firefox".`)
  process.exit(1)
}

console.log(`\nBuilding for ${browser}...`)

execSync('npx vite build', { stdio: 'inherit', cwd: root })
execSync('npx vite build --mode background', { stdio: 'inherit', cwd: root })

writeFileSync(
  join(root, 'dist', 'manifest.json'),
  JSON.stringify(MANIFESTS[browser], null, 2),
)

console.log(`\n✓ Build complete → dist/  (target: ${browser})`)
