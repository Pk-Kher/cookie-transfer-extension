# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. See [README.md](./README.md) for a user-facing overview.

## Commands

```bash
npm run build:chrome      # production build for Chrome → dist/
npm run build:firefox     # production build for Firefox → dist/
npm run dev:options       # Vite dev server for options UI (localhost:5173/options.html)
npm run typecheck         # tsc --noEmit (covers src/ only)
npx tsc -p tsconfig.node.json --noEmit  # typecheck vite.config.ts + scripts/
npm run icons             # regenerate public/icons/*.png (pure Node.js, no deps)
```

After building, reload the extension in Chrome via the **↻** button on `chrome://extensions`.

## Architecture

### Two-phase build

`scripts/build.js` runs two Vite builds then writes a browser-specific `dist/manifest.json`:

1. **Options build** (`vite build`, default mode): entry point `options.html` at project root → outputs `dist/options.html`, `dist/options.js`, `dist/assets/`, `dist/chunks/`
2. **Background build** (`vite build --mode background`): single entry `src/background/service-worker.ts` → `dist/background.js` (ESM, no code splitting, `emptyOutDir: false`)

The HTML entry point lives at the **project root** (not inside `src/`) so Vite outputs it as `dist/options.html`. A file at `src/options/options.html` would produce `dist/src/options/options.html`, which the manifest can't reference correctly.

### Cross-browser manifest

`manifest.base.json` holds all shared fields. `scripts/build.js` merges browser-specific background config:
- Chrome: `background.service_worker = "background.js"` + `type: "module"`
- Firefox: `background.scripts = ["background.js"]` + `browser_specific_settings.gecko`

### Extension UX model

No popup. Clicking the icon (or pressing the keyboard shortcut) directly copies cookies via the background service worker. `_execute_action` is a reserved command name — it fires `browser.action.onClicked` automatically for both icon clicks and the assigned shortcut, so no separate `commands.onCommand` listener is needed.

The only UI surface is the **options page** (`options.html` → `src/options/`). The service worker does its work entirely from `action.onClicked`; there is no `runtime.onMessage` listener, so no UI sends it messages.

Settings (source URL + cookie names) are stored in `browser.storage.local` under key `cookieTransferSettings`. Defaults (`https://lpus02.bookitall.com/`, cookies `s_utkn` + `rpt_data`) are written to storage on first options page load.

### Cookie copy flow

`src/background/service-worker.ts`:
1. `onClicked` → `runCopy(tabId, tabUrl)`
2. Load settings from storage (fall back to DEFAULTS if empty). If source URL or cookie names are unset, open the options page and return.
3. **Same-origin guard** — if the active tab is already on the source domain (`extractHostname` match), set badge `SAME` (amber) and return without copying. Overwriting live cookies with mutated attributes (path, secure, hostOnly→domain) would break the session.
4. Set badge `...` (indigo), call `handleCopyCookies()`
5. For each cookie name: `cookies.get(sourceUrl, name)` → `cookies.set(targetUrl, ...)`
   - Downgrades `sameSite: no_restriction` → `lax` when target is HTTP (Chrome enforces SameSite=None requires Secure)
   - `secure` flag kept only when target is HTTPS
   - Sets `domain` only for non-hostOnly cookies, and never for localhost/IP/IPv6 targets (`isHostOnlyTarget`) — Chrome rejects those as invalid
   - Copies `expirationDate` only when still in the future; otherwise it becomes a session cookie
   - On a rejected `cookies.set`, the error is recorded — **no retry with stripped attributes** (would overwrite a secure/httpOnly cookie with a plain one and corrupt the session)
6. Reload `targetTabId` only if ≥1 cookie copied. Set badge `OK` (green) / `ERR` (red); on failure also set the icon title to the first error. Clear badge + title after 3s.

### TypeScript config split

- `tsconfig.json` — covers `src/` only; lib: DOM + ES2020; no Node types
- `tsconfig.node.json` — covers `vite.config.ts` + `scripts/`; lib: DOM + ES2023; types: node

`src/vite-env.d.ts` provides `/// <reference types="vite/client" />` so CSS imports type-check.

### Keyboard shortcut (Chrome)

`suggested_key` in the manifest is only applied on **fresh install**, not on reload of an unpacked extension. To set/change the shortcut manually: `chrome://extensions/shortcuts`. Firefox supports `browser.commands.update()` for programmatic updates; Chrome does not — the options page UI handles both cases.

### Icons

`scripts/generate-icons.js` — pure Node.js PNG encoder (CRC32 + zlib deflate, zero npm deps). Outputs 16×16, 48×48, 128×128 indigo (#6366f1) PNGs to `public/icons/`. Run once; commit the output.
