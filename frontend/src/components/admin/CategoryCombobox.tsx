import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Tag } from 'lucide-react'
import { translate, type Locale } from '../../i18n'
import { categoryDisplayLabel, isAdminOnlyCategory } from '../../utils/productCategories'

interface CategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  locale: Locale
  placeholder?: string
}

export default function CategoryCombobox({
  value,
  onChange,
  suggestions,
  locale,
  placeholder,
}: CategoryComboboxProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return suggestions
    return suggestions.filter((name) => {
      const label = categoryDisplayLabel(name, locale).toLowerCase()
      return name.toLowerCase().includes(q) || label.includes(q)
    })
  }, [suggestions, value, locale])

  useEffect(() => {
    setHighlight(0)
  }, [filtered, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const select = (name: string) => {
    onChange(name)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setHighlight((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setHighlight((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && open && filtered.length > 0) {
      e.preventDefault()
      select(filtered[highlight]!)
      return
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-stretch overflow-hidden rounded-lg border bg-white shadow-sm transition-[border-color,box-shadow] duration-200 ${
          open
            ? 'border-accent ring-2 ring-accent/20'
            : 'border-stone-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={translate(locale, 'admin.categoryToggleList')}
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
          className="flex w-10 shrink-0 items-center justify-center border-l border-stone-100 text-ink-muted transition-colors hover:bg-stone-50 hover:text-ink"
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_12px_40px_-8px_rgba(28,25,23,0.15)]"
        >
          <p className="border-b border-stone-100 bg-stone-50/80 px-3 py-2 text-[0.6875rem] font-medium uppercase tracking-wide text-ink-faint">
            {translate(locale, 'admin.categorySuggestions')}
          </p>
          <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-muted">
                {translate(locale, 'admin.categoryNoMatch')}
              </li>
            ) : (
              filtered.map((name, index) => {
                const label = categoryDisplayLabel(name, locale)
                const adminOnly = isAdminOnlyCategory(name)
                const active = index === highlight
                return (
                  <li key={name} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => select(name)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                        active ? 'bg-accent-muted/80 text-ink' : 'text-ink hover:bg-stone-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                          adminOnly
                            ? 'border-amber-200/80 bg-amber-50 text-amber-800'
                            : 'border-stone-100 bg-stone-50 text-ink-muted'
                        }`}
                        aria-hidden
                      >
                        <Tag size={14} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium leading-snug">{label}</span>
                          {adminOnly ? (
                            <span className="ui-badge rounded-md bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-900">
                              {translate(locale, 'admin.adminOnlyBadge')}
                            </span>
                          ) : null}
                        </span>
                        {name !== label ? (
                          <span className="mt-0.5 block font-mono text-xs text-ink-faint">{name}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {value.trim() &&
            !filtered.some((n) => n.toLowerCase() === value.trim().toLowerCase()) && (
              <p className="border-t border-stone-100 px-3 py-2 text-xs text-ink-faint">
                {translate(locale, 'admin.categoryCustomHint', { value: value.trim() })}
              </p>
            )}
        </div>
      )}
    </div>
  )
}
