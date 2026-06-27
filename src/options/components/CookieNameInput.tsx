import { useId } from 'react'

interface Props {
  names: string[]
  onChange: (names: string[]) => void
  disabled?: boolean
}

export default function CookieNameInput({ names, onChange, disabled }: Props) {
  const legendId = useId()

  const update = (index: number, value: string) => {
    const next = [...names]
    next[index] = value
    onChange(next)
  }

  const remove = (index: number) => {
    if (names.length === 1) {
      onChange([''])
      return
    }
    onChange(names.filter((_, i) => i !== index))
  }

  const add = () => onChange([...names, ''])

  return (
    <fieldset aria-labelledby={legendId} className="space-y-2">
      <legend
        id={legendId}
        className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Cookie Names
      </legend>

      {names.map((name, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => update(index, e.target.value)}
            placeholder={`cookie_name_${index + 1}`}
            disabled={disabled}
            aria-label={`Cookie name ${index + 1}`}
            spellCheck={false}
            className="
              flex-1 px-3 py-2 text-sm font-mono
              border border-gray-300 dark:border-gray-600 rounded-md
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          />
          <button
            type="button"
            onClick={() => remove(index)}
            disabled={disabled}
            aria-label={`Remove cookie name ${index + 1}`}
            className="
              p-1.5 rounded
              text-gray-400 hover:text-red-500 dark:hover:text-red-400
              focus:outline-none focus:ring-2 focus:ring-red-500
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors
            "
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="
          flex items-center gap-1.5 mt-1
          text-xs text-indigo-600 dark:text-indigo-400
          hover:text-indigo-700 dark:hover:text-indigo-300
          focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 1v10M1 6h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Add cookie name
      </button>
    </fieldset>
  )
}
