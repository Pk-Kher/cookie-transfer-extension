import browser from 'webextension-polyfill'
import { isValidUrl, isSecureUrl, extractHostname } from '../utils/cookie-utils'
import type { CopyResult, StoredSettings } from '../types'

const STORAGE_KEY = 'cookieTransferSettings'

const DEFAULTS: StoredSettings = {
  sourceUrl: 'https://lpus02.bookitall.com/',
  cookieNames: ['s_utkn', 'rpt_data'],
}

// Fires on icon click AND on _execute_action keyboard shortcut (Alt+Shift+C)
browser.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url) {
    runCopy(tab.id, tab.url)
  }
})

async function runCopy(tabId: number, tabUrl: string): Promise<void> {
  const data = await browser.storage.local.get(STORAGE_KEY)
  const settings = (data[STORAGE_KEY] as StoredSettings | undefined) ?? DEFAULTS

  if (!settings.sourceUrl || !settings.cookieNames.some((n) => n.trim())) {
    await browser.runtime.openOptionsPage()
    return
  }

  // Skip same-origin copies — would overwrite live cookies with potentially
  // mutated attributes (path, secure, hostOnly→domain), breaking the session
  if (extractHostname(settings.sourceUrl) === extractHostname(tabUrl)) {
    await browser.action.setBadgeBackgroundColor({ color: '#f59e0b' })
    await browser.action.setBadgeText({ tabId, text: 'SAME' })
    await browser.action.setTitle({
      tabId,
      title: 'Active tab is already on the source domain — no copy needed.',
    })
    setTimeout(() => {
      browser.action.setBadgeText({ tabId, text: '' })
      browser.action.setTitle({ tabId, title: '' })
    }, 3000)
    return
  }

  await browser.action.setBadgeBackgroundColor({ color: '#6366f1' })
  await browser.action.setBadgeText({ tabId, text: '...' })

  const result = await handleCopyCookies({
    sourceUrl: settings.sourceUrl,
    cookieNames: settings.cookieNames,
    targetUrl: tabUrl,
    targetTabId: tabId,
  })

  const ok = result.copiedCookies.length > 0

  await browser.action.setBadgeBackgroundColor({ color: ok ? '#22c55e' : '#ef4444' })
  await browser.action.setBadgeText({ tabId, text: ok ? 'OK' : 'ERR' })

  if (!ok) {
    const detail =
      result.errors[0] ??
      (result.notFoundCookies.length > 0
        ? `Not found: ${result.notFoundCookies.join(', ')}`
        : 'Unknown error')
    await browser.action.setTitle({
      tabId,
      title: `Cookie copy failed — ${detail}. See service worker console.`,
    })
  }

  setTimeout(() => {
    browser.action.setBadgeText({ tabId, text: '' })
    browser.action.setTitle({ tabId, title: '' })
  }, 3000)
}

async function handleCopyCookies(payload: {
  sourceUrl: string
  cookieNames: string[]
  targetUrl: string
  targetTabId: number
}): Promise<CopyResult> {
  const { sourceUrl, cookieNames, targetUrl, targetTabId } = payload

  if (!isValidUrl(sourceUrl)) {
    return fail('Invalid source URL. Must start with http:// or https://')
  }
  if (!isValidUrl(targetUrl)) {
    return fail('Invalid target URL.')
  }

  const targetIsSecure = isSecureUrl(targetUrl)
  const copiedCookies: string[] = []
  const notFoundCookies: string[] = []
  const errors: string[] = []

  for (const rawName of cookieNames) {
    const name = rawName.trim()
    if (!name) continue

    try {
      const cookie = await browser.cookies.get({ url: sourceUrl, name })

      if (!cookie) {
        notFoundCookies.push(name)
        continue
      }

      const secureFlag = cookie.secure && targetIsSecure

      // SameSite=None requires Secure — downgrade to Lax if target is HTTP
      const sameSite =
        cookie.sameSite === 'no_restriction' && !targetIsSecure
          ? ('lax' as const)
          : (cookie.sameSite ?? undefined)

      const details: Parameters<typeof browser.cookies.set>[0] = {
        url: targetUrl,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || '/',
        secure: secureFlag,
        httpOnly: cookie.httpOnly,
        sameSite,
      }

      // Only set domain for non-hostOnly cookies; setting domain on a hostOnly
      // cookie would create a domain-scoped duplicate alongside the host-only one.
      // Skip domain for localhost/IPs — Chrome rejects "Domain=localhost" and IPs
      // as invalid; those targets must be host-only.
      const targetHost = new URL(targetUrl).hostname
      if (!cookie.hostOnly && !isHostOnlyTarget(targetHost)) {
        details.domain = targetHost
      }

      if (
        cookie.expirationDate !== undefined &&
        cookie.expirationDate > Date.now() / 1000
      ) {
        details.expirationDate = cookie.expirationDate
      }

      try {
        await browser.cookies.set(details)
        copiedCookies.push(name)
      } catch (setErr) {
        // Do NOT retry with stripped attributes — would overwrite a secure
        // httpOnly cookie with a plain one and corrupt the session
        const msg = setErr instanceof Error ? setErr.message : String(setErr)
        console.error('[cookie-transfer] cookies.set failed:', name, msg, details)
        errors.push(`${name}: ${msg}`)
      }
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (copiedCookies.length > 0) {
    try {
      await browser.tabs.reload(targetTabId)
    } catch {
      // non-fatal
    }
  }

  return {
    success: errors.length === 0 && copiedCookies.length > 0,
    copiedCookies,
    notFoundCookies,
    errors,
  }
}

function fail(message: string): CopyResult {
  return { success: false, copiedCookies: [], notFoundCookies: [], errors: [message] }
}

function isHostOnlyTarget(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true
  // IPv6 (bracketed in URL hostname when applicable)
  if (hostname.includes(':')) return true
  return false
}
