import { Search } from 'lucide-react'
import { useLocaleStore } from '../../stores/localeStore'
import { translate } from '../../i18n'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  className?: string
  size?: 'default' | 'large'
  ariaExpanded?: boolean
  ariaControls?: string
  /** Emphasize focus ring when the results panel is open. */
  active?: boolean
}

export default function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = '문서 검색…',
  className = '',
  size = 'default',
  ariaExpanded,
  ariaControls,
  active = false,
}: SearchFieldProps) {
  const locale = useLocaleStore((s) => s.locale)
  const isLarge = size === 'large'

  if (isLarge) {
    return (
      <div
        className={`flex items-center gap-1 rounded-2xl border bg-white p-1 shadow-md transition-[border-color,box-shadow,ring-color] duration-200 ${
          active
            ? 'border-accent/35 shadow-lg ring-4 ring-accent/10'
            : 'border-stone-200/90 hover:border-stone-300'
        } ${className}`}
      >
        <input
          type="search"
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border-0 bg-transparent py-3 pl-4 pr-2 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          aria-label={placeholder}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-autocomplete="list"
          role="combobox"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30"
          aria-label="검색"
        >
          <Search size={18} strokeWidth={2.25} aria-hidden />
          <span className="hidden sm:inline">{translate(locale, 'search.submit')}</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative flex items-center rounded-xl border bg-white shadow-sm transition-[border-color,box-shadow] duration-200 ${
        active
          ? 'border-accent/35 ring-2 ring-accent/15'
          : 'border-stone-200 hover:border-stone-300'
      } ${className}`}
    >
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-ink-faint"
        aria-hidden
      />
      <input
        type="search"
        placeholder={placeholder}
        className="w-full min-w-[12rem] rounded-xl border-0 bg-transparent py-2 pl-9 pr-10 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-0 md:min-w-[14rem]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        aria-label={placeholder}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-autocomplete="list"
        role="combobox"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="absolute right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/30"
        aria-label="검색"
      >
        <Search size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
