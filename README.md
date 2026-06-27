# Cookie Transfer

A cross-browser (Chrome + Firefox) Manifest V3 extension that copies cookies from a configured **source site** onto the **active tab's domain** with a single click or keyboard shortcut, then reloads the tab so the new session takes effect.

Useful when you authenticate on one host (e.g. a shared login/identity domain) and need that session reflected on another host you're testing against.

## How it works

There is no popup. Clicking the toolbar icon — or pressing the shortcut (**Alt+Shift+C** by default) — runs the copy immediately:

1. Read settings (source URL + cookie names) from `browser.storage.local`.
2. For each configured cookie: `cookies.get()` from the source URL → `cookies.set()` onto the active tab's URL.
3. Reload the active tab.

A badge on the icon reports status:

| Badge | Color  | Meaning                                                    |
|-------|--------|------------------------------------------------------------|
| `...` | indigo | Copy in progress                                           |
| `OK`  | green  | At least one cookie copied                                 |
| `ERR` | red    | Copy failed (hover the icon / see service worker console)  |
| `SAME`| amber  | Active tab is already on the source domain — copy skipped  |

Badge and title clear after 3 seconds.

### Cookie handling details

- **Same-origin guard** — copies are skipped when the active tab is already on the source domain, to avoid overwriting live cookies with mutated attributes and breaking the session.
- **SameSite downgrade** — `SameSite=None` cookies are downgraded to `Lax` when the target is HTTP, since Chrome requires `Secure` for `SameSite=None`.
- **Host-only handling** — `domain` is only set for non-host-only cookies, and never for `localhost` / IP / IPv6 targets (Chrome rejects those).
- **Secure flag** — kept only when the target is HTTPS.
- **Expiry** — copied only when still in the future; otherwise the cookie becomes a session cookie.
- **No lossy retry** — a rejected `cookies.set` is reported, not retried with stripped attributes (which would corrupt a secure/httpOnly session cookie).

## Settings

Open the options page (right-click the icon → Options, or `chrome://extensions` → Details → Extension options):

- **Source Site URL** — domain cookies are read from.
- **Cookie names** — which cookies to copy.
- **Keyboard shortcut** — editable on Firefox (`commands.update()`); on Chrome it is read-only and must be changed at `chrome://extensions/shortcuts`.

Settings are stored in `browser.storage.local` under `cookieTransferSettings`. On first load of the options page, defaults are written:

- Source URL: `https://lpus02.bookitall.com/`
- Cookies: `s_utkn`, `rpt_data`

## Development

```bash
npm install

npm run build:chrome      # production build for Chrome → dist/
npm run build:firefox     # production build for Firefox → dist/
npm run dev:options       # Vite dev server for options UI (localhost:5173/options.html)
npm run typecheck         # tsc --noEmit (covers src/)
npm run icons             # regenerate public/icons/*.png
```

### Load the unpacked build

**Chrome** — `chrome://extensions` → enable Developer mode → **Load unpacked** → select `dist/`. After rebuilding, reload via the **↻** button.

**Firefox** — `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `dist/manifest.json`.

## Tech stack

- TypeScript, React 18, Tailwind CSS
- Vite (two-phase build: UI bundle + background service worker)
- `webextension-polyfill` for the cross-browser `browser.*` API

## Project layout

```
manifest.base.json          shared manifest fields
options.html                HTML entry point (at root → dist/options.html)
scripts/build.js            two Vite builds + browser-specific manifest
scripts/generate-icons.js   zero-dependency PNG icon generator
src/background/             service worker (copy flow)
src/options/               options page UI + components
src/utils/                 URL / cookie helpers
src/types/                 shared types
```

See [CLAUDE.md](./CLAUDE.md) for build internals and architecture notes.
