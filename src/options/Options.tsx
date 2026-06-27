import { useState, useEffect, useCallback, useId } from 'react'
import browser from 'webextension-polyfill'
import CookieNameInput from './components/CookieNameInput'
import ShortcutRecorder from './components/ShortcutRecorder'
import type { StoredSettings } from '../types'

const STORAGE_KEY = 'cookieTransferSettings'

export const DEFAULTS: StoredSettings = {
  sourceUrl: 'https://lpus02.bookitall.com/',
  cookieNames: ['s_utkn', 'rpt_data'],
}

const DEFAULT_SHORTCUT = 'Alt+Shift+C'

// Firefox supports commands.update(); Chrome does not
const canUpdateShortcut =
  typeof (browser.commands as unknown as Record<string, unknown>).update === 'function'

export default function Options() {
  const [sourceUrl, setSourceUrl] = useState(DEFAULTS.sourceUrl)
  const [cookieNames, setCookieNames] = useState<string[]>(DEFAULTS.cookieNames)
  const [shortcut, setShortcut] = useState(DEFAULT_SHORTCUT)
  const [saved, setSaved] = useState(false)
  const sourceUrlId = useId()

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEY).then((data) => {
      const s = data[STORAGE_KEY] as StoredSettings | undefined
      if (s?.sourceUrl) setSourceUrl(s.sourceUrl)
      if (s?.cookieNames?.length) setCookieNames(s.cookieNames)
      if (!s) {
        browser.storage.local.set({ [STORAGE_KEY]: DEFAULTS })
      }
    })

    browser.commands.getAll().then((cmds) => {
      const action = cmds.find((c) => c.name === '_execute_action')
      if (action?.shortcut) setShortcut(action.shortcut)
    })
  }, [])

  const persist = useCallback(async (url: string, names: string[]) => {
    await browser.storage.local.set({ [STORAGE_KEY]: { sourceUrl: url, cookieNames: names } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const handleSourceUrlChange = (url: string) => {
    setSourceUrl(url)
    persist(url, cookieNames)
  }

  const handleCookieNamesChange = (names: string[]) => {
    setCookieNames(names)
    persist(sourceUrl, names)
  }

  const handleSaveShortcut = async (newShortcut: string) => {
    const update = (browser.commands as unknown as Record<string, unknown>).update as (
      d: { name: string; shortcut: string }
    ) => Promise<void>
    await update({ name: '_execute_action', shortcut: newShortcut })
    setShortcut(newShortcut)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="5" r="1.5" fill="white" />
              <circle cx="10" cy="8" r="1.5" fill="white" />
              <circle cx="5" cy="11" r="1.5" fill="white" />
              <path d="M6.5 5h5M6.5 8h1M6.5 11h5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              Cookie Transfer
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Settings</p>
          </div>
          <span
            className={`text-sm font-medium transition-opacity duration-300 ${
              saved ? 'opacity-100 text-green-600 dark:text-green-400' : 'opacity-0'
            }`}
            aria-live="polite"
          >
            Saved ✓
          </span>
        </div>

        {/* Cookie settings */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cookie Source</h2>

          <div>
            <label
              htmlFor={sourceUrlId}
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Source Site URL
            </label>
            <input
              id={sourceUrlId}
              type="url"
              value={sourceUrl}
              onChange={(e) => handleSourceUrlChange(e.target.value)}
              placeholder="https://example.com"
              spellCheck={false}
              autoComplete="url"
              className="
                w-full px-3 py-2.5 text-sm
                border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                transition-colors
              "
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Cookies are read from this domain and written to the active tab.
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Copies are skipped when the active tab is already on this domain.
            </p>
          </div>

          <CookieNameInput names={cookieNames} onChange={handleCookieNamesChange} />
        </div>

        {/* Shortcut settings */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Keyboard Shortcut</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Copies cookies to the active tab without clicking the icon.
            </p>
          </div>

          <ShortcutRecorder
            value={shortcut}
            canUpdate={canUpdateShortcut}
            onSave={handleSaveShortcut}
          />

          {!canUpdateShortcut && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Default shortcut is{' '}
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                Alt+Shift+C
              </kbd>
              . If it's not working, set it manually at the link above.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
