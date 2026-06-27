import { useState, useEffect, useCallback } from 'react'

interface Props {
  value: string
  canUpdate: boolean
  onSave: (shortcut: string) => Promise<void>
}

const MODIFIERS = new Set(['Control', 'Alt', 'Shift', 'Meta'])

function buildShortcut(e: KeyboardEvent): string | null {
  if (MODIFIERS.has(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('MacCtrl')

  if (parts.length === 0) return null

  const KEY_MAP: Record<string, string> = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End',
    PageUp: 'PageUp', PageDown: 'PageDown', Tab: 'Tab',
    F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
    F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
    ' ': 'Space',
  }

  const key = KEY_MAP[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : null)
  if (!key) return null

  parts.push(key)
  return parts.join('+')
}

function ShortcutBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {text.split('+').map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-400 text-xs">+</span>}
          <kbd className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
            {part}
          </kbd>
        </span>
      ))}
    </span>
  )
}

export default function ShortcutRecorder({ value, canUpdate, onSave }: Props) {
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const startRecording = () => {
    if (!canUpdate) return
    setRecording(true)
    setStatus('idle')
  }

  const stopRecording = () => setRecording(false)

  const handleKey = useCallback(async (e: KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setRecording(false)
      return
    }

    const shortcut = buildShortcut(e)
    if (!shortcut) return

    setRecording(false)

    try {
      await onSave(shortcut)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid shortcut')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [onSave])

  useEffect(() => {
    if (!recording) return
    window.addEventListener('keydown', handleKey, { capture: true })
    return () => window.removeEventListener('keydown', handleKey, { capture: true })
  }, [recording, handleKey])

  if (!canUpdate) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          {value ? <ShortcutBadge text={value} /> : (
            <span className="text-sm text-gray-500">Not set</span>
          )}
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Chrome doesn't allow extensions to change shortcuts programmatically.
          <br />
          Set it manually at{' '}
          <span className="font-mono font-medium select-all cursor-text">chrome://extensions/shortcuts</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm
          transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500
          ${recording
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 animate-pulse'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
          }
        `}
        aria-label={recording ? 'Press shortcut keys' : 'Click to record shortcut'}
      >
        <span className={recording ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 dark:text-gray-400'}>
          {recording ? 'Press shortcut… (Esc to cancel)' : 'Click to change'}
        </span>
        {!recording && value && <ShortcutBadge text={value} />}
      </button>

      {status === 'saved' && (
        <p className="text-xs text-green-600 dark:text-green-400">Shortcut updated ✓</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
      )}
    </div>
  )
}
